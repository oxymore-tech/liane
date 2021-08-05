using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Rp;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Liane.Service.Internal.Rp
{
    /**
     * Classes to load overpass data.
     */
    internal sealed record OverpassData(double Version, string Generator, List<OverpassElement> Elements);

    internal sealed record OverpassElement(double Lat, double Lon, OverpassTag Tags);

    internal sealed record OverpassTag(string Name);

    public class RallyingPointServiceImpl : IRallyingPointService
    {
        private const string FileName = "Ressources/villes.json";
        private const int RadiusSelection = 25_000;
        private const int RadiusInterpolation = 1_000;
        
        private readonly MongoClient mongo;
        private readonly ILogger<RallyingPointServiceImpl> logger;
        
        private readonly IMongoCollection<DbRallyingPoint> rallyingPointsCollection;
        
        public RallyingPointServiceImpl(MongoSettings settings, ILogger<RallyingPointServiceImpl> logger)
        {
            this.logger = logger;
            mongo = new MongoClient(new MongoClientSettings
            {
                Server = new MongoServerAddress(settings.Host, 27017),
                Credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password)
            });
            
            var database = mongo.GetDatabase(MongoKeys.Database());
            rallyingPointsCollection = database.GetCollection<DbRallyingPoint>(MongoKeys.RallyingPoints());
        }
        
        public async Task Add(LatLng pos, string name)
        {
            await rallyingPointsCollection.InsertOneAsync(new DbRallyingPoint(ObjectId.GenerateNewId(), name, pos));
        }

        public async Task Delete(string id)
        {
            await rallyingPointsCollection.DeleteOneAsync(rp => rp.Id == ObjectId.Parse(id));
        }

        public async Task Move(string id, LatLng pos)
        {
            await rallyingPointsCollection.UpdateOneAsync(
                rp => rp.Id == ObjectId.Parse(id),
                Builders<DbRallyingPoint>.Update.Set(
                    l => l.Location.Coordinates, 
                    new GeoJson2DGeographicCoordinates(pos.Lng, pos.Lat)
                    )
                );
        }

        public async Task ChangeState(string id, bool isActive)
        {
            await rallyingPointsCollection.UpdateOneAsync(
                rp => rp.Id == ObjectId.Parse(id),
                Builders<DbRallyingPoint>.Update.Set(
                    l => l.IsActive, 
                    isActive
                )
            );
        }

        public async Task LoadFile()
        {
            try
            {
                // Flush the old database
                await rallyingPointsCollection.DeleteManyAsync(_ => true);
                await rallyingPointsCollection.Indexes.DropAllAsync();

                // Create the database index
                await rallyingPointsCollection.Indexes.CreateOneAsync(new CreateIndexModel<DbRallyingPoint>(Builders<DbRallyingPoint>.IndexKeys.Geo2DSphere(x => x.Location)));
                
                // Load the data
                await using var file = File.OpenRead(FileName);
                var options = new JsonSerializerOptions {PropertyNameCaseInsensitive = true};
                var data = await JsonSerializer.DeserializeAsync<OverpassData>(file, options);

                if (data is not null)
                {
                    // Add the data to the database
                    List<DbRallyingPoint> rallyingPoints = data.Elements.Select(e => new DbRallyingPoint(ObjectId.GenerateNewId(), e.Tags.Name, e.Lat, e.Lon)).ToList();
                    await rallyingPointsCollection.InsertManyAsync(rallyingPoints);
                    logger.LogInformation("Rallying points re-created with " + rallyingPoints.Count + " entries.");
                }
            }
            catch (Exception e)
            {
                logger.LogError("An error happened during the creation of the mongo collection : " + e.Message);
                logger.LogError(e.StackTrace);
            }
        }

        public async Task<ImmutableList<RallyingPoint>> List(LatLng pos)
        {
            return await GetClosest(pos, RadiusSelection);
        }

        public async Task<ImmutableList<RallyingPoint>> GetClosest(LatLng pos, double radius)
        {
            var point = GeoJson.Point(new GeoJson2DGeographicCoordinates(pos.Lng, pos.Lat));
            var filter = Builders<DbRallyingPoint>.Filter.Near(x => x.Location, point, RadiusSelection);
            
            var r = (await rallyingPointsCollection.FindAsync(filter))
                .ToEnumerable()
                .Select(rp => rp.ToRallyingPoint())
                .ToImmutableList();

            return r;
        }

        public async Task<RallyingPoint?> GetFirstClosest(LatLng pos, double radius)
        {
            return (await GetClosest(pos, RadiusSelection)).First();
        }

        public async Task<ImmutableList<RallyingPoint>> Interpolate(ImmutableList<LatLng> locations)
        {
            var rallyingPoints = ImmutableList.CreateBuilder<RallyingPoint>();

            foreach (var l in locations)
            {
                var result = await GetFirstClosest(l, RadiusInterpolation);

                if (result is null) continue;
                
                rallyingPoints.Add(result);
            }

            return rallyingPoints.Distinct().ToImmutableList();
        }
    }
}