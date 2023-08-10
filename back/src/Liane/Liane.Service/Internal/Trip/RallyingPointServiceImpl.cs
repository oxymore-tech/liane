using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using Dapper;
using Liane.Api.Address;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Trip.Import;
using Liane.Service.Internal.Util.Sql;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Liane.Service.Internal.Trip;

public sealed class RallyingPointServiceImpl : IRallyingPointService
{
  private static readonly Regex NonAlphanumeric = new("[^a-zA-Z0-9]+");

  private static readonly string[] AccentedChars =
  {
    "[aáÁàÀâÂäÄãÃåÅæÆ]",
    "[cçÇ]",
    "[eéÉèÈêÊëË]",
    "[iíÍìÌîÎïÏ]",
    "[nñÑ]",
    "[oóÓòÒôÔöÖõÕøØœŒß]",
    "[uúÚùÙûÛüÜ]"
  };

  private readonly ILogger<RallyingPointServiceImpl> logger;
  private readonly MemoryCache pointCache = new(new MemoryCacheOptions());
  private readonly IAddressService addressService;
  private readonly IOsrmService osrmService;
  private readonly PostgisDatabase db;

  public RallyingPointServiceImpl(ILogger<RallyingPointServiceImpl> logger, IAddressService addressService, IOsrmService osrmService, PostgisDatabase db)
  {
    this.logger = logger;
    this.addressService = addressService;
    this.osrmService = osrmService;
    this.db = db;
  }

  public Task<RallyingPoint> Get(Ref<RallyingPoint> reference)
  {
    return pointCache.GetOrCreateAsync(reference, async _ =>
    {
      using var connection = db.NewConnection();
      return await connection.GetAsync(reference);
    })!;
  }

  public Task<Dictionary<string, RallyingPoint>> GetMany(ImmutableList<Ref<RallyingPoint>> references)
  {
    throw new NotImplementedException();
  }

  public async Task Generate()
  {
    logger.LogInformation("Generate rallying points...");

    logger.LogDebug("Loading carpool areas...");
    IEnumerable<RallyingPoint> rawRallyingPoints = await LoadCarpoolArea();
    logger.LogDebug("Loading town halls...");
    rawRallyingPoints = rawRallyingPoints.Concat(await LoadTownHall());

    logger.LogDebug("Clustering...");

    // Cluster points 
    var grouped = new List<ImmutableList<RallyingPoint>>();
    var list = rawRallyingPoints.OrderBy(r => r.Location.Lng).ToList();
    while (list.Count > 0)
    {
      var point = list.Last();
      var close = new List<RallyingPoint>();
      for (var i = list.Count - 1; i >= 0; i--)
      {
        var r = list[i];
        if (Math.Abs(point.Location.Lng - r.Location.Lng) > 0.01) break; // Points are too far anyways 
        if (!(r.Location.Distance(point.Location) <= 500))
        {
          continue;
        }

        close.Add(r);
        list.RemoveAt(i);
      }

      grouped.Add(close.ToImmutableList());
    }

    var pool = new Semaphore(initialCount: 8, maximumCount: 8);
    var rallyingPointsMerger = await grouped.SelectAsync(async g =>
    {
      var selected = new List<RallyingPoint> { g.First() };
      var count = g.Count;
      if (count <= 1)
      {
        return selected;
      }

      // Group by real routing distance
      var dict = g.Select((rp, index) => new { Id = rp.Id!, Index = index }).ToDictionary(rp => rp.Id, rp => rp.Index);
      pool.WaitOne();
      var table = await osrmService.Table(g.Select(rp => rp.Location));
      pool.Release();
      foreach (var rp in g.Skip(1))
      {
        var i1 = dict[rp.Id!];
        if (selected.All(rp1 => table.Distances[i1][dict[rp1.Id!]] > 500 && table.Distances[dict[rp1.Id!]][i1] > 500))
        {
          selected.Add(rp);
        }
      }

      return selected;
    }, true);

    var rallyingPoints = rallyingPointsMerger.SelectMany(r => r)
      .ToImmutableList();

    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    await connection.DeleteAsync(Filter<RallyingPoint>.Empty, tx);
    await connection.InsertMultipleAsync(rallyingPoints, tx);

    tx.Commit();
    logger.LogInformation("Rallying points re-created with {Count} entries", rallyingPoints.Count);
  }

  public async Task<ImmutableList<RallyingPoint>> List(LatLng? center, int? distance = null, string? search = null, int? limit = null)
  {
    var filter = Filter<RallyingPoint>.Empty;

    if (search is not null)
    {
      var regex = ToSearchPattern(search);
      filter &= Filter<RallyingPoint>.Regex(r => r.Label, regex)
                | Filter<RallyingPoint>.Regex(r => r.City, regex)
                | Filter<RallyingPoint>.Regex(r => r.ZipCode, regex)
                | Filter<RallyingPoint>.Regex(r => r.Address, regex);
    }

    if (center.HasValue)
    {
      filter &= Filter<RallyingPoint>.Near(x => x.Location, center.Value, distance ?? 500_000);
    }

    using var connection = db.NewConnection();

    var query = Query.Select<RallyingPoint>()
      .Where(filter)
      .Take(limit);

    if (center.HasValue)
    {
      query = query.OrderBy(rp => rp.Location.Distance(center.Value));
    }

    return await connection.QueryAsync(query);
  }

  private static string ToSearchPattern(string search)
  {
    var words = NonAlphanumeric.Replace(search, " ")
      .Trim()
      .ToLower()
      .Split();

    return string.Concat(words.Select(w =>
    {
      var removeAccent = AccentedChars.Aggregate(w, (current, accentedChar) => Regex.Replace(current, accentedChar, accentedChar));
      return $@"\m{removeAccent}.*";
    }));
  }

  public async Task<bool> Update(Ref<RallyingPoint> reference, RallyingPoint inputDto)
  {
    using var connection = db.NewConnection();
    var updated = await connection.UpdateAsync(inputDto);
    return updated > 0;
  }

  public async Task<RallyingPoint?> Snap(LatLng position, int radius = 100)
  {
    using var connection = db.NewConnection();
    var query = Query.Select<RallyingPoint>()
      .Where(Filter<RallyingPoint>.Near(x => x.Location, position, radius));
    return await connection.FirstOrDefaultAsync(query);
  }

  public async Task<RallyingPoint?> SnapViaRoute(LatLng position, int radius = 100)
  {
    using var connection = db.NewConnection();
    var query = Query.Select<RallyingPoint>()
      .Where(Filter<RallyingPoint>.Near(x => x.Location, position, radius));
    var list = await connection.QueryAsync(query);

    if (list.Count < 1) return null;

    var table = await osrmService.Table(new List<LatLng> { position }.Concat(list.Select(rp => rp.Location)));
    // Get closest point via road network 
    var closest = list.Select((l, i) => (Point: l, Distance: table.Distances[0][i + 1])).MinBy(r => r.Distance);
    return closest.Distance <= radius ? closest.Point : null;
  }

  private async Task<ImmutableList<RallyingPoint>> LoadCarpoolArea()
  {
    var assembly = typeof(RallyingPointServiceImpl).Assembly;
    var zipCodes = (await LoadZipcodes()).DistinctBy(z => z.Insee).ToDictionary(z => z.Insee);
    await using var stream = assembly.GetManifestResourceStream("Liane.Service.Resources.bnlc.csv");
    if (stream is null)
    {
      throw new ResourceNotFoundException("Unable to find bnlc.csv");
    }

    using var reader = new StreamReader(stream);
    var configuration = new CsvConfiguration(CultureInfo.InvariantCulture) { PrepareHeaderForMatch = (args) => args.Header.NormalizeToCamelCase() };
    using var csvReader = new CsvReader(reader, configuration);

    var entries = csvReader.GetRecords<BnlcEntry>();

    var fullAddressRegex = new Regex("[^\"]+[.] (\\d{5}) [^\"]+");
    var pool = new Semaphore(initialCount: 8, maximumCount: 8);
    var rp = await entries.SelectAsync(async e =>
    {
      var locationType = e.Type.ToLower() switch
      {
        "aire de covoiturage" => LocationType.CarpoolArea,
        "sortie d'autoroute" => LocationType.HighwayExit,
        "parking" => LocationType.Parking,
        "supermarché" => LocationType.Supermarket,
        "parking relais" => LocationType.RelayParking,
        "délaissé routier" => LocationType.AbandonedRoad,
        "auto-stop" => LocationType.AutoStop,
        _ => throw new ArgumentOutOfRangeException($"Location type {e.Type} unexpected")
      };
      var address = e.AdLieu;
      var city = e.ComLieu;
      var location = new LatLng(e.YLat, e.XLong);
      string zipCode;
      if (fullAddressRegex.IsMatch(address))
      {
        // Remove 2nd part in addresses with with zipcode + city 
        var match = fullAddressRegex.Match(address);
        zipCode = match.Groups[1].Value;
      }
      else
      {
        if (zipCodes.TryGetValue(e.Insee, out var v))
        {
          zipCode = v.Zipcode;
        }
        else
        {
          try
          {
            pool.WaitOne();
            var foundAddress = await addressService.GetDisplayName(location);
            zipCode = foundAddress.Address.ZipCode;
            address = foundAddress.Address.Street;
            pool.Release();
          }
          catch (Exception error)
          {
            logger.LogError("Could not import {Name}: {Error}", e.NomLieu, error.Message);
            pool.Release();
            return null;
          }
        }
      }

      return new RallyingPoint($"bnlc:{e.IdLieu}", e.NomLieu, location, locationType, address, zipCode, city, e.NbrePl, true); //TODO format com lieu
    }, parallel: true);
    return rp.Where(p => p != null).Cast<RallyingPoint>().ToImmutableList();
  }

  private static async Task<ImmutableList<ZipCodeEntry>> LoadZipcodes()
  {
    var assembly = typeof(RallyingPointServiceImpl).Assembly;
    await using var stream = assembly.GetManifestResourceStream("Liane.Service.Resources.cities_fr.csv");
    if (stream is null)
    {
      throw new ResourceNotFoundException("Unable to find cities_fr.csv");
    }

    using var reader = new StreamReader(stream);
    var configuration = new CsvConfiguration(CultureInfo.InvariantCulture) { PrepareHeaderForMatch = (args) => args.Header.NormalizeToCamelCase(), Delimiter = ";", HeaderValidated = null };
    using var csvReader = new CsvReader(reader, configuration);

    return csvReader.GetRecords<ZipCodeEntry>().ToImmutableList();
  }

  private async Task<ImmutableList<RallyingPoint>> LoadTownHall()
  {
    var assembly = typeof(RallyingPointServiceImpl).Assembly;
    await using var stream = assembly.GetManifestResourceStream("Liane.Service.Resources.mairies.csv");
    if (stream is null)
    {
      throw new ResourceNotFoundException("Unable to find mairies.csv");
    }

    using var reader = new StreamReader(stream);
    var configuration = new CsvConfiguration(CultureInfo.InvariantCulture) { PrepareHeaderForMatch = (args) => args.Header.NormalizeToCamelCase() };
    using var csvReader = new CsvReader(reader, configuration);

    var entries = csvReader.GetRecords<MairieEntry>();

    return entries
      .Where(e => e.Latitude is not null && e.Longitude is not null)
      .Select(e =>
      {
        var location = new LatLng((double)e.Latitude!, (double)e.Longitude!);
        return new RallyingPoint($"mairie:{e.CodeInsee}", e.NomOrganisme, location, LocationType.TownHall, e.Adresse, e.CodePostal, e.NomCommune, null, true);
      })
      .DistinctBy(e => e.Id)
      .ToImmutableList();
  }

  public Task<bool> Delete(Ref<RallyingPoint> reference)
  {
    throw new NotImplementedException();
  }

  public Task<RallyingPoint> Create(RallyingPoint obj)
  {
    throw new NotImplementedException();
  }

  public async Task Insert(IEnumerable<RallyingPoint> rallyingPoints)
  {
    using var connection = db.NewConnection();
    await connection.InsertMultipleAsync(rallyingPoints);
  }
}