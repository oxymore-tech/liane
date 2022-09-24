using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.RallyingPoints;

internal sealed record OverpassData(double Version, string Generator, List<OverpassElement> Elements);

internal sealed record OverpassElement(double Lat, double Lon, OverpassTag Tags);

internal sealed record OverpassTag(string Name);

public sealed class RallyingPointServiceImpl : IRallyingPointService
{
    private const int SelectionRadius = 25_000;
    private const int MaxRadius = 400_000;
    private const int MaxRallyingPoint = 10;

    private readonly ILogger<RallyingPointServiceImpl> logger;

    private readonly IMongoDatabase mongo;

    public RallyingPointServiceImpl(MongoSettings settings, ILogger<RallyingPointServiceImpl> logger)
    {
        this.logger = logger;
        mongo = settings.GetDatabase();
    }

    public async Task<RallyingPoint> Get(string id)
    {
        var dbRallyingPoint = (await mongo.GetCollection<DbRallyingPoint>()
                .FindAsync(p => p.Id == new ObjectId(id)))
            .Single();
        return dbRallyingPoint.ToRallyingPoint();
    }

    public async Task<RallyingPoint> Create(RallyingPoint rallyingPoint)
    {
        var newId = ObjectId.GenerateNewId();
        var created = rallyingPoint with { Id = newId.ToString() };
        await mongo.GetCollection<DbRallyingPoint>()
            .InsertOneAsync(ToDbRallyingPoint(created));
        return created;
    }

    public async Task Delete(string id)
    {
        await mongo.GetCollection<DbRallyingPoint>()
            .DeleteOneAsync(rp => rp.Id == ObjectId.Parse(id));
    }

    public async Task Update(string id, RallyingPoint rallyingPoint)
    {
        await mongo.GetCollection<DbRallyingPoint>()
            .ReplaceOneAsync(
                rp => rp.Id == ObjectId.Parse(id),
                ToDbRallyingPoint(rallyingPoint)
            );
    }

    public async Task ImportCities()
    {
        try
        {
            await mongo.GetCollection<DbRallyingPoint>()
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
                // Add the data to the database
                List<DbRallyingPoint> rallyingPoints = data.Elements.Select(e => new DbRallyingPoint(ObjectId.GenerateNewId(), e.Tags.Name, e.Lat, e.Lon)).ToList();
                await mongo.GetCollection<DbRallyingPoint>()
                    .InsertManyAsync(rallyingPoints);
                logger.LogInformation("Rallying points re-created with " + rallyingPoints.Count + " entries.");
            }
        }
        catch (Exception e)
        {
            logger.LogError("An error happened during the creation of the mongo collection : " + e.Message);
            logger.LogError(e.StackTrace);
        }
    }

    public async Task<ImmutableList<RallyingPoint>> List(LatLng? pos, string? search)
    {
        return await ListInternal(pos, search);
    }

    private async Task<ImmutableList<RallyingPoint>> ListInternal(LatLng? pos, string? search)
    {
        var builder = Builders<DbRallyingPoint>.Filter;
        var result = ImmutableList.Create<RallyingPoint>();
        var searchRadius = SelectionRadius;

        // Keep looking for matching rallying points (name and location) by doubling the selection radius around the location
        while (result.IsEmpty && searchRadius < MaxRadius)
        {
            var filter = FilterDefinition<DbRallyingPoint>.Empty;
            if (pos != null)
            {
                var point = GeoJson.Point(new GeoJson2DGeographicCoordinates(pos.Lng, pos.Lat));
                filter &= builder.Near(x => x.Location, point, searchRadius);
            }

            if (search != null)
            {
                var cleanedSearch = Regex.Replace(search, "\\s+", " ");
                var regex = new Regex(".*" + cleanedSearch + ".*", RegexOptions.IgnoreCase);
                filter &= builder.Regex(x => x.Label, new BsonRegularExpression(regex));
            }

            result = (await mongo.GetCollection<DbRallyingPoint>()
                    .FindAsync(filter))
                .ToEnumerable()
                .Select(rp => rp.ToRallyingPoint())
                .Take(MaxRallyingPoint)
                .ToImmutableList();

            searchRadius *= 2;
        }

        return result;
    }

    private async Task<RallyingPoint?> GetFirstClosest(LatLng? pos)
    {
        return (await ListInternal(pos, null)).First();
    }

    public async Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> locations)
    {
        var rallyingPoints = ImmutableList.CreateBuilder<RallyingPoint>();

        foreach (var l in locations)
        {
            var result = await GetFirstClosest(l);

            if (result is null) continue;

            rallyingPoints.Add(result);
        }

        return rallyingPoints.Distinct().ToImmutableList();
    }

    private static DbRallyingPoint ToDbRallyingPoint(RallyingPoint rallyingPoint)
    {
        return new DbRallyingPoint(ObjectId.Parse(rallyingPoint.Id), rallyingPoint.Label, rallyingPoint.Location, rallyingPoint.IsActive);
    }
}