using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Rp;
using Liane.Service.Internal.Rp;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using StackExchange.Redis;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Liane.Service
{
    /**
     * Classes to load overpass data.
     */
    sealed record OverpassData(double Version, string Generator, List<OverpassElement> Elements);

    sealed record OverpassElement(double Lat, double Lng, OverpassTag Tags);

    sealed record OverpassTag(string Name);

    public class RallyingPointServiceImpl2 : IRallyingPointService2
    {
        private const string FileName = "Ressources/villes.json";
        private const string CoordinatesFieldName = "Coordinates";
        
        private readonly MongoClient mongo;
        private readonly ILogger<RallyingPointServiceImpl2> logger;
        
        private readonly IMongoCollection<DbRallyingPoint> rallyingPointsCollection;
        
        public RallyingPointServiceImpl2(MongoSettings settings, ILogger<RallyingPointServiceImpl2> logger)
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
        
        public async Task Add()
        {
            
        }

        public async Task Delete(string id)
        {
            
        }

        public async Task Move(string id, LatLng pos)
        {
            
        }

        public async Task LoadFile()
        {
            try
            {
                // Create the database index
                await rallyingPointsCollection.Indexes.CreateOneAsync(new CreateIndexModel<DbRallyingPoint>(Builders<DbRallyingPoint>.IndexKeys.Geo2D(CoordinatesFieldName)));
            
                // Load the data
                await using var file = File.OpenRead(FileName);
                var options = new JsonSerializerOptions {PropertyNameCaseInsensitive = true};
                var data = await JsonSerializer.DeserializeAsync<OverpassData>(file, options);

                if (data is not null)
                {
                    // Add the data to the database
                    IEnumerable<DbRallyingPoint> rallyingPoints = data.Elements.Select(e => new DbRallyingPoint(ObjectId.GenerateNewId(), e.Tags.Name, new []{e.Lng, e.Lat}));
                    await rallyingPointsCollection.InsertManyAsync(rallyingPoints);
                }
            }
            catch (Exception e)
            {
                logger.LogError("An error happened during the creation of the mongo collection : " + e.Message);
                logger.LogError(e.StackTrace);
            }
        }

        public async Task<ImmutableList<RallyingPoint2>> List(LatLng pos)
        {
            return null;
        }

        public async Task<List<RallyingPoint2>> GetClosest(RedisKey key, LatLng pos, double radius, GeoUnit unit)
        {
            return null;
        }

        public async Task<RallyingPoint2?> GetFirstClosest(RedisKey key, LatLng pos, double radius, GeoUnit unit)
        {
            return null;
        }
    }
}