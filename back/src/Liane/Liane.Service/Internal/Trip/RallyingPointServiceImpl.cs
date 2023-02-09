using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CsvHelper;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

internal sealed record OverpassData(double Version, string Generator, List<OverpassElement> Elements);

internal sealed record OverpassElement(long Id, double Lat, double Lon, OverpassTag Tags);

internal sealed record OverpassTag(string Name);

public sealed class RallyingPointServiceImpl : MongoCrudService<RallyingPoint>, IRallyingPointService
{
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

  private const int MaxRadius = 400_000;
  private const int MaxRallyingPoint = 10;

  private readonly ILogger<RallyingPointServiceImpl> logger;

  public RallyingPointServiceImpl(IMongoDatabase mongo, ILogger<RallyingPointServiceImpl> logger)
    : base(mongo)
  {
    this.logger = logger;
  }

  public async Task ImportCities()
  {
    await Mongo.GetCollection<RallyingPoint>()
      .DeleteManyAsync(_ => true);

    var assembly = typeof(RallyingPointServiceImpl).Assembly;

    var rallyingPoints = await LoadCities(assembly);
    await Mongo.GetCollection<RallyingPoint>()
      .InsertManyAsync(rallyingPoints);
    logger.LogInformation("Rallying points re-created with {Count} entries", rallyingPoints.Count);
  }

  public async Task<ImmutableList<RallyingPoint>> List(LatLng? pos, string? search)
  {
    var builder = Builders<RallyingPoint>.Filter;

    var filter = FilterDefinition<RallyingPoint>.Empty;
    if (pos.HasValue)
    {
      var point = GeoJson.Point(new GeoJson2DGeographicCoordinates(pos.Value.Lng, pos.Value.Lat));
      filter &= builder.Near(x => x.Location, point, MaxRadius);
    }

    if (search != null)
    {
      var regex = new Regex($".*{ToSearchPattern(search)}.*", RegexOptions.IgnoreCase);
      filter &= builder.Regex(x => x.Label, new BsonRegularExpression(regex));
    }

    return (await Mongo.GetCollection<RallyingPoint>()
        .Find(filter)
        .Limit(MaxRallyingPoint)
        .ToCursorAsync())
      .ToEnumerable()
      .ToImmutableList();
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

  public async Task<RallyingPoint?> Snap(LatLng position)
  {
    const int radius = 100;
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

  private static string ToSearchPattern(string search)
  {
    search = Regex.Escape(search);
    return AccentedChars.Aggregate(search, (current, accentedChar) => Regex.Replace(current, accentedChar, accentedChar));
  }

  protected override RallyingPoint ToDb(RallyingPoint inputDto, string id)
  {
    return inputDto with { Id = id };
  }

  private static async Task<ImmutableList<RallyingPoint>> LoadCities(Assembly assembly)
  {
    var resourceName = assembly.GetManifestResourceNames().Single(str => str.EndsWith("cities.json"));
    await using var file = assembly.GetManifestResourceStream(resourceName);
    if (file is null)
    {
      throw new ResourceNotFoundException("Unable to find cities.json");
    }

    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
    var data = await JsonSerializer.DeserializeAsync<OverpassData>(file, options);

    if (data is not null)
    {
      return data.Elements.Select(e => new RallyingPoint($"city:{e.Id}", e.Tags.Name, new LatLng(e.Lat, e.Lon), true))
        .ToImmutableList();
    }

    return ImmutableList<RallyingPoint>.Empty;
  }

  private static async Task<ImmutableList<RallyingPoint>> LoadCarpoolArea(Assembly assembly)
  {
    var resourceName = assembly.GetManifestResourceNames().Single(str => str.EndsWith("bnlc.csv"));
    await using var stream = assembly.GetManifestResourceStream(resourceName);
    if (stream is null)
    {
      throw new ResourceNotFoundException("Unable to find cities.json");
    }

    using var reader = new StreamReader(stream);
    using var csvReader = new CsvReader(reader, CultureInfo.InvariantCulture);

    var entries = csvReader.GetRecords<BnlcEntry>();

    return entries.Select(e => new RallyingPoint($"bnlc:{e.IdLieu}", e.NomLieu, new LatLng(e.YLat, e.XLong), true))
      .ToImmutableList();
  }
}