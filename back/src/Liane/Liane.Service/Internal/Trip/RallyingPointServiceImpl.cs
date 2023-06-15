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
using Liane.Api.Address;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Trip.Import;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

public sealed class RallyingPointServiceImpl : MongoCrudService<RallyingPoint>, IRallyingPointService
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

  public RallyingPointServiceImpl(IMongoDatabase mongo, ILogger<RallyingPointServiceImpl> logger, IAddressService addressService, IOsrmService osrmService)
    : base(mongo)
  {
    this.logger = logger;
    this.addressService = addressService;
    this.osrmService = osrmService;
  }

  public override Task<RallyingPoint> Get(Ref<RallyingPoint> reference)
  {
    return pointCache.GetOrCreateAsync(reference, _ => base.Get(reference))!;
  }

  public async Task Generate()
  {
    logger.LogInformation("Generate rallying points...");
    await Mongo.GetCollection<RallyingPoint>()
      .DeleteManyAsync(_ => true);

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
        if (r.Location.Distance(point.Location) <= 500)
        {
          close.Add(r);
          list.RemoveAt(i);
        }
      }

      grouped.Add(close.ToImmutableList());
    }

    var pool = new Semaphore(initialCount: 8, maximumCount: 8);
    var rallyingPointsMerger =
      grouped.SelectAsync(async g =>
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
    var rallyingPoints = (await rallyingPointsMerger).SelectMany(r => r).ToImmutableList();
    await Mongo.GetCollection<RallyingPoint>()
      .InsertManyAsync(rallyingPoints);
    logger.LogInformation("Rallying points re-created with {Count} entries", rallyingPoints.Count);
  }

  public async Task<ImmutableList<RallyingPoint>> List(LatLng? from, LatLng? to, int? distance = null, string? search = null, int? limit = null)
  {
    var filter = FilterDefinition<RallyingPoint>.Empty;
    var isLimitedBoxSearch = from is not null && to is not null && limit is not null;

    if (search is not null)
    {
      var regex = new Regex(ToSearchPattern(search), RegexOptions.IgnoreCase);
      filter &= Builders<RallyingPoint>.Filter.Regex(x => x.Label, new BsonRegularExpression(regex))
                | Builders<RallyingPoint>.Filter.Regex(x => x.City, new BsonRegularExpression(regex))
                | Builders<RallyingPoint>.Filter.Regex(x => x.ZipCode, new BsonRegularExpression(regex))
                | Builders<RallyingPoint>.Filter.Regex(x => x.Address, new BsonRegularExpression(regex));
    }

    if (from.HasValue)
    {
      if (to.HasValue)
      {
        var box = GeoJson.BoundingBox(new GeoJson2DGeographicCoordinates(from.Value.Lng, from.Value.Lat), new GeoJson2DGeographicCoordinates(to.Value.Lng, to.Value.Lat));
        filter &= Builders<RallyingPoint>.Filter.GeoWithinBox(x => x.Location, box.Min.Longitude, box.Min.Latitude, box.Max.Longitude, box.Max.Latitude);
      }
      else
      {
        var center = GeoJson.Point(new GeoJson2DGeographicCoordinates(from.Value.Lng, from.Value.Lat));
        filter &= Builders<RallyingPoint>.Filter.Near(x => x.Location, center, distance ?? 500_000);
      }
    }

    var results = (await Mongo.GetCollection<RallyingPoint>()
        .Find(filter)
        .Limit(isLimitedBoxSearch ? null : limit)
        .ToCursorAsync())
      .ToEnumerable();

    if (isLimitedBoxSearch)
    {
      // Limit manually to get those closest to center
      var center = new LatLng((from!.Value.Lat + to!.Value.Lat) / 2, (from.Value.Lng + to.Value.Lng) / 2);
      return results
        .OrderBy(rp => rp.Location.Distance(center))
        .Take(limit!.Value)
        .ToImmutableList();
    }

    return results.ToImmutableList();
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
      return $@"\b{removeAccent}.*";
    }));
  }

  public async Task<bool> Update(Ref<RallyingPoint> reference, RallyingPoint inputDto)
  {
    var res = await Mongo.GetCollection<RallyingPoint>()
      .ReplaceOneAsync(
        rp => rp.Id == reference.Id,
        ToDb(inputDto, reference.Id)
      );
    return res.IsAcknowledged;
  }

  public async Task<RallyingPoint?> Snap(LatLng position, int radius = 100)
  {
    var builder = Builders<RallyingPoint>.Filter;
    var point = GeoJson.Point(new GeoJson2DGeographicCoordinates(position.Lng, position.Lat));
    var filter = builder.Near(x => x.Location, point, radius);

    return await Mongo.GetCollection<RallyingPoint>()
      .Find(filter)
      .FirstOrDefaultAsync();
  }

  public async Task<RallyingPoint?> SnapViaRoute(LatLng position, int radius = 100)
  {
    var builder = Builders<RallyingPoint>.Filter;
    var point = GeoJson.Point(new GeoJson2DGeographicCoordinates(position.Lng, position.Lat));
    var filter = builder.Near(x => x.Location, point, radius);

    var results = await Mongo.GetCollection<RallyingPoint>()
      .Find(filter)
      .ToCursorAsync();
    var list = results.ToEnumerable().ToImmutableList();
    if (list.Count < 1) return null;

    var table = await osrmService.Table(new List<LatLng> { position }.Concat(list.Select(rp => rp.Location)));
    // Get closest point via road network 
    var closest = list.Select((l, i) => (Point: l, Distance: table.Distances[0][i + 1])).MinBy(r => r.Distance);
    return closest.Point;
  }


  public async Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> locations)
  {
    var rallyingPoints = ImmutableList.CreateBuilder<RallyingPoint>();

    foreach (var l in locations)
    {
      var result = await Snap(l);

      if (result is null) continue;

      rallyingPoints.Add(result);
    }

    return rallyingPoints.Distinct().ToImmutableList();
  }

  protected override RallyingPoint ToDb(RallyingPoint inputDto, string id)
  {
    return inputDto with { Id = id };
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
}