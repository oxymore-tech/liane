using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip
{
    public class LianeTripServiceImpl : ILianeTripService
    {
        private const string DatabaseKey = "liane";
        private const string LianeCollectionKey = "real_liane";
        private const string LianeTripCollectionKey = "liane_trip";

        private readonly IRedis redis;
        private readonly MongoClient mongo;
        private readonly ICurrentContext currentContext;
        private readonly ILogger<LianeTripServiceImpl> logger;

        public LianeTripServiceImpl(IRedis redis, MongoClient mongo, ICurrentContext currentContext, ILogger<LianeTripServiceImpl> logger)
        {
            this.redis = redis;
            this.mongo = mongo;
            this.currentContext = currentContext;
            this.logger = logger;
        }
        
        public async Task Create(ImmutableHashSet<ImmutableHashSet<RallyingPoint>> rallyingPointsSets, long timestamp)
        {
            var database = mongo.GetDatabase(DatabaseKey);
            var lianes = database.GetCollection<Liane>(LianeCollectionKey);
            var lianeTrips = database.GetCollection<LianeTrip>(LianeTripCollectionKey);
            
            // Iterate over the hashset
            foreach (var rallyingPoints in rallyingPointsSets)
            {
                // Create the rallying points pairs
                foreach (var from in rallyingPoints.SkipLast(1).Select((r, i) => new { r, i }))
                {
                    foreach (var to in rallyingPoints.Skip(from.i + 1))
                    {
                        var results = await lianes.FindAsync(new ExpressionFilterDefinition<Liane>(l => l.From == from.r && l.To == to));
                        
                        if (results.ToEnumerable().Any())
                        {
                            await UpdateLiane(results.First(), timestamp);
                        }
                        else
                        {
                            await CreateLiane(new Liane(ObjectId.GenerateNewId(), from.r, to, new List<ObjectId>()), timestamp);
                        }
                    }
                }   
            }
        }

        public async Task Delete(string lianeTripId)
        {
            
        }

        public async Task<List<FilteredLiane>> Snap(LatLng center, TripFilter tripFilter)
        {
            return null;
        }

        private async Task UpdateLiane(Liane liane, long timestamp)
        {
            var lianeUsageId = ObjectId.GenerateNewId();
            var lianeUsage = new LianeUsage(lianeUsageId, currentContext.CurrentUser(), timestamp, liane.Id);
        }

        private async Task CreateLiane(Liane liane, long timestamp)
        {
            var lianeUsageId = ObjectId.GenerateNewId();
            var lianeUsage = new LianeUsage(lianeUsageId, currentContext.CurrentUser(), timestamp, liane.Id);
        }
        
    }
}