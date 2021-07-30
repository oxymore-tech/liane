using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Api.Util;
using Liane.Service.Internal.Util;
using MongoDB.Driver;
using StackExchange.Redis;

namespace Liane.Service
{
    public class RallyingPointServiceImpl2 : IRallyingPointService2
    {
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
            await rallyingPointsCollection.Indexes.CreateOneAsync(new CreateIndexModel<RallyingPoint2>(Builders<RallyingPoint2>.IndexKeys.Geo2D("Coordinates")));
            
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