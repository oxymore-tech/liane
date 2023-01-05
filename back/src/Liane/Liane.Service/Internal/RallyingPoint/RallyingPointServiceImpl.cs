using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.RallyingPoint;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.RallyingPoint;

internal sealed record OverpassData(double Version, string Generator, List<OverpassElement> Elements);

internal sealed record OverpassElement(long Id, double Lat, double Lon, OverpassTag Tags);

internal sealed record OverpassTag(string Name);

public sealed class RallyingPointServiceImpl : IRallyingPointService
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

    private readonly IMongoDatabase mongo;

    public RallyingPointServiceImpl(MongoSettings settings, ILogger<RallyingPointServiceImpl> logger)
    {
        this.logger = logger;
        mongo = settings.GetDatabase();
    }

    public async Task<Api.RallyingPoint.RallyingPoint> Get(string id)
    {
        var rallyingPoint = await mongo.GetCollection<Api.RallyingPoint.RallyingPoint>()
            .Find(p => p.Id == id)
            .FirstOrDefaultAsync();
        if (rallyingPoint is null)
        {
            throw new ResourceNotFoundException($"RallyingPoint '{id}' not found");
        }

        return rallyingPoint;
    }

    public async Task<Api.RallyingPoint.RallyingPoint> Create(Api.RallyingPoint.RallyingPoint rallyingPoint)
    {
        var newId = ObjectId.GenerateNewId();
        var created = rallyingPoint with { Id = newId.ToString() };
        await mongo.GetCollection<Api.RallyingPoint.RallyingPoint>()
            .InsertOneAsync(created);
        return created;
    }

    public async Task Delete(string id)
    {
        await mongo.GetCollection<Api.RallyingPoint.RallyingPoint>()
            .DeleteOneAsync(rp => rp.Id == id);
    }

    public async Task Update(string id, Api.RallyingPoint.RallyingPoint rallyingPoint)
    {
        await mongo.GetCollection<Api.RallyingPoint.RallyingPoint>()
            .ReplaceOneAsync(
                rp => rp.Id == id,
                rallyingPoint
            );
    }

    public async Task ImportCities()
    {
        await mongo.GetCollection<Api.RallyingPoint.RallyingPoint>()
            .DeleteManyAsync(_ => true);

        var assembly = Assembly.GetEntryAssembly()!;

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
            var rallyingPoints = data.Elements.Select(e => new Api.RallyingPoint.RallyingPoint($"city:{e.Id}", e.Tags.Name, new LatLng(e.Lat, e.Lon), true))
                .ToList();
            await mongo.GetCollection<Api.RallyingPoint.RallyingPoint>()
                .InsertManyAsync(rallyingPoints);
            logger.LogInformation("Rallying points re-created with {Count} entries", rallyingPoints.Count);
        }
    }

    public async Task<ImmutableList<Api.RallyingPoint.RallyingPoint>> List(LatLng? pos, string? search)
    {
        var builder = Builders<Api.RallyingPoint.RallyingPoint>.Filter;

        var filter = FilterDefinition<Api.RallyingPoint.RallyingPoint>.Empty;
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

        return (await mongo.GetCollection<Api.RallyingPoint.RallyingPoint>()
                .Find(filter)
                .Limit(MaxRallyingPoint)
                .ToCursorAsync())
            .ToEnumerable()
            .ToImmutableList();
    }

    public async Task<Api.RallyingPoint.RallyingPoint?> Snap(LatLng position)
    {
        const int radius = 100;
        var builder = Builders<Api.RallyingPoint.RallyingPoint>.Filter;
        var point = GeoJson.Point(new GeoJson2DGeographicCoordinates(position.Lng, position.Lat));
        var filter = builder.Near(x => x.Location, point, radius);

        return await mongo.GetCollection<Api.RallyingPoint.RallyingPoint>()
            .Find(filter)
            .FirstOrDefaultAsync();
    }

    public async Task<ImmutableList<Api.RallyingPoint.RallyingPoint>> Interpolate(ImmutableList<LatLng> locations)
    {
        var rallyingPoints = ImmutableList.CreateBuilder<Api.RallyingPoint.RallyingPoint>();

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
}