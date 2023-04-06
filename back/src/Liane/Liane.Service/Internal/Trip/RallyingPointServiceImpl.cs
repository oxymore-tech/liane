using System;
using System.Collections.Immutable;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
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

  public RallyingPointServiceImpl(IMongoDatabase mongo, ILogger<RallyingPointServiceImpl> logger)
    : base(mongo)
  {
    this.logger = logger;
  }

  public override Task<RallyingPoint> Get(Ref<RallyingPoint> reference)
  {
    return pointCache.GetOrCreateAsync(reference, _ => base.Get(reference))!;
  }

  public async Task Generate()
  {
    await Mongo.GetCollection<RallyingPoint>()
      .DeleteManyAsync(_ => true);

    var assembly = typeof(RallyingPointServiceImpl).Assembly;

    var rallyingPoints = (await LoadCarpoolArea(assembly))
      .Concat(await LoadTownHall(assembly))
      .DistinctBy(p => p.Location)
      .ToImmutableList();
    await Mongo.GetCollection<RallyingPoint>()
      .InsertManyAsync(rallyingPoints);
    logger.LogInformation("Rallying points re-created with {Count} entries", rallyingPoints.Count);
  }

  public async Task<ImmutableList<RallyingPoint>> List(LatLng? from, LatLng? to, int? distance = null, string? search = null, int? limit = null)
  {
    var filter = FilterDefinition<RallyingPoint>.Empty;

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

    return (await Mongo.GetCollection<RallyingPoint>()
        .Find(filter)
        .Limit(limit)
        .ToCursorAsync())
      .ToEnumerable()
      .ToImmutableList();
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

  private static async Task<ImmutableList<RallyingPoint>> LoadCarpoolArea(Assembly assembly)
  {
    await using var stream = assembly.GetManifestResourceStream("Liane.Service.Resources.bnlc.csv");
    if (stream is null)
    {
      throw new ResourceNotFoundException("Unable to find bnlc.csv");
    }

    using var reader = new StreamReader(stream);
    var configuration = new CsvConfiguration(CultureInfo.InvariantCulture) { PrepareHeaderForMatch = (args) => args.Header.NormalizeToCamelCase() };
    using var csvReader = new CsvReader(reader, configuration);

    var entries = csvReader.GetRecords<BnlcEntry>();

    return entries.Select(e =>
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
        return new RallyingPoint($"bnlc:{e.IdLieu}", e.NomLieu, new LatLng(e.YLat, e.XLong), locationType, e.AdLieu, e.Insee, e.ComLieu, e.NbrePl, true);
      })
      .ToImmutableList();
  }

  private static async Task<ImmutableList<RallyingPoint>> LoadTownHall(Assembly assembly)
  {
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