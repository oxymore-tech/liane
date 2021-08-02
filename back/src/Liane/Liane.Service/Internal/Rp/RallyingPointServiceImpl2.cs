using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.IO;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Api.Rp;
using Liane.Api.Util;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;
using Newtonsoft.Json;
using StackExchange.Redis;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Liane.Service
{
    /**
     * Classes to load overpass data.
     */
    sealed record OverpassData(string Version, string Generator, List<OverpassElement> Elements);

    sealed record OverpassElement(double Lat, double Lng, OverpassTag Tags);

    sealed record OverpassTag(string Name);

    public class RallyingPointServiceImpl2 : IRallyingPointService2
    {
        private const string FileName = "villes.json";
        private const string CoordinatesFieldName = "Coordinates";
        
        private readonly MongoClient mongo;
        
        private readonly IMongoCollection<RallyingPoint2> rallyingPointsCollection;
        
        public RallyingPointServiceImpl2(MongoSettings settings)
        {
            mongo = new MongoClient(new MongoClientSettings
            {
                Server = new MongoServerAddress(settings.Host, 27017),
                Credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password)
            });
            
            var database = mongo.GetDatabase(MongoKeys.Database());
            rallyingPointsCollection = database.GetCollection<RallyingPoint2>(MongoKeys.RallyingPoints());
            
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
                await rallyingPointsCollection.Indexes.CreateOneAsync(new CreateIndexModel<RallyingPoint2>(Builders<RallyingPoint2>.IndexKeys.Geo2D(CoordinatesFieldName)));
            
                // Load the data
                var rallyingPoints = new List<RallyingPoint2>();
                await using var file = File.OpenRead(FileName);
                var data = await JsonSerializer.DeserializeAsync<OverpassData>(file);
            
                foreach (var e in data.Elements)
                {
                    rallyingPoints.Add(new (e.Tags.Name, new []{e.Lng, e.Lat}));
                }
                
                // Add the data to the database
                await rallyingPointsCollection.InsertManyAsync(rallyingPoints);
            }
            catch (Exception e)
            {
                
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