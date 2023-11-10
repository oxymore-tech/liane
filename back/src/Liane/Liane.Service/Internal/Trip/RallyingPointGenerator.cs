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
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Trip.Import;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Trip;

public sealed class RallyingPointGenerator : IRallyingPointGenerator
{
  private const int MinDistanceBetweenPointsInMeter = 375;
  private readonly IOsrmService osrmService;
  private readonly IAddressService addressService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly ILogger<RallyingPointGenerator> logger;

  public RallyingPointGenerator(IOsrmService osrmService, ILogger<RallyingPointGenerator> logger, IRallyingPointService rallyingPointService, IAddressService addressService)
  {
    this.osrmService = osrmService;
    this.logger = logger;
    this.rallyingPointService = rallyingPointService;
    this.addressService = addressService;
  }

  public async Task Generate(ImmutableList<string> sources)
  {
    logger.LogInformation("Generate rallying points...");
    IEnumerable<RallyingPoint> rawRallyingPoints;
    if (sources.Count == 1 && sources.First() == "test")
    {
      rawRallyingPoints = await LoadTownHall();
      rawRallyingPoints = rawRallyingPoints.Where(rp => new[] { "46", "31", "48", "09", "81", "82", "12" }.Any(code => rp.ZipCode.StartsWith(code)));
    }
    else
    {
      logger.LogDebug("Loading carpool areas...");
      rawRallyingPoints = await LoadCarpoolArea();
      logger.LogDebug("Loading town halls...");
      rawRallyingPoints = rawRallyingPoints.Concat(await LoadTownHall());
      logger.LogDebug("Loading custom rallying points...");
      rawRallyingPoints = rawRallyingPoints.Concat(LoadCustom());
    }

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
        if (!(r.Location.Distance(point.Location) <= MinDistanceBetweenPointsInMeter))
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
        if (selected.All(rp1 => table.Distances[i1][dict[rp1.Id!]] > MinDistanceBetweenPointsInMeter && table.Distances[dict[rp1.Id!]][i1] > MinDistanceBetweenPointsInMeter))
        {
          selected.Add(rp);
        }
      }

      return selected;
    }, true);

    var rallyingPoints = rallyingPointsMerger.SelectMany(r => r)
      .ToImmutableList();

    await rallyingPointService.Insert(rallyingPoints, true);

    logger.LogInformation("Rallying points re-created with {Count} entries", rallyingPoints.Count);
  }

  private IEnumerable<RallyingPoint> LoadCustom()
  {
    yield return new RallyingPoint("custom:001", "Living Objects", new LatLng(43.567936, 1.390924), LocationType.Parking, "1 impasse Marcel Chalard", "31000", "Toulouse", 10, true);
    yield return new RallyingPoint("custom:002", "Michel Labrousse", new LatLng(43.568356, 1.386925), LocationType.Parking, "11 rue Michel Labrousse", "31000", "Toulouse", null, true);
    yield return new RallyingPoint("custom:003", "Basso com'pôtes", new LatLng(43.565190, 1.388705), LocationType.Supermarket, "17 rue Paulin Talabot", "31000", "Toulouse", null, true);
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