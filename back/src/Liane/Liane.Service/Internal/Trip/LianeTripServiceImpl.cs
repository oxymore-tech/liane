using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.Trip
{
    public class LianeTripServiceImpl : ILianeTripService
    {
        private const string DatabaseKey = "liane";
        private const string LianeCollectionKey = "real_liane";
        private const string LianeTripCollectionKey = "liane_trip";
        private const string LianeUsagesCollectionKey = "liane_usages";

        private readonly IRedis redis;
        private readonly MongoClient mongo;
        private readonly ICurrentContext currentContext;
        private readonly ILogger<LianeTripServiceImpl> logger;
        
        private readonly IMongoCollection<UsedLiane> lianes;
        private readonly IMongoCollection<UserLianeTrip> lianeTrips;
        private readonly IMongoCollection<UserLianeUsage> lianeUsages;

        public LianeTripServiceImpl(IRedis redis, MongoClient mongo, ICurrentContext currentContext, ILogger<LianeTripServiceImpl> logger)
        {
            this.redis = redis;
            this.mongo = mongo;
            this.currentContext = currentContext;
            this.logger = logger;
            
            var database = mongo.GetDatabase(DatabaseKey);
            lianes = database.GetCollection<UsedLiane>(LianeCollectionKey);
            lianeTrips = database.GetCollection<UserLianeTrip>(LianeTripCollectionKey);
            lianeUsages = database.GetCollection<UserLianeUsage>(LianeUsagesCollectionKey);
        }
        
        public async Task Create(ImmutableHashSet<ImmutableHashSet<RallyingPoint>> rallyingPointsSets, long timestamp)
        {
            // Iterate over the hashset
            foreach (var rallyingPoints in rallyingPointsSets)
            {
                var lianeTrip = new UserLianeTrip(ObjectId.GenerateNewId(), currentContext.CurrentUser(), new List<ObjectId>());
                
                // Create the rallying points pairs
                foreach (var from in rallyingPoints.SkipLast(1).Select((r, i) => new { r, i }))
                {
                    foreach (var to in rallyingPoints.Skip(from.i + 1))
                    {
                        var results = await lianes.FindAsync(new ExpressionFilterDefinition<UsedLiane>(l => l.From == from.r && l.To == to));

                        if (await results.AnyAsync()) // The liane already exists, add an usage
                        {
                            var liane = results.First();
                            var lianeUsage = new UserLianeUsage(ObjectId.GenerateNewId(), currentContext.CurrentUser(), timestamp, liane.Id);
                            
                            lianeTrip.Lianes.Add(liane.Id);
                            
                            await lianeUsages.InsertOneAsync(lianeUsage);
                            await lianes.UpdateOneAsync(l => l.Id == liane.Id, Builders<UsedLiane>.Update.AddToSet(l => l.Usages, lianeUsage.Id));
                        }
                        else // The liane doesn't exists, create it
                        {
                            var liane = new UsedLiane(ObjectId.GenerateNewId(), from.r, to, new List<ObjectId>());
                            var lianeUsage = new UserLianeUsage(ObjectId.GenerateNewId(), currentContext.CurrentUser(), timestamp, liane.Id);
                            var database = await redis.Get();
                            
                            lianeTrip.Lianes.Add(liane.Id);
                            liane.Usages.Add(lianeUsage.Id);

                            database.GeoAdd(RedisKeys.LianeGeo(), from.r.Position.Lat, from.r.Position.Lng, liane.Id.ToString());
                            await lianeUsages.InsertOneAsync(lianeUsage);
                            await lianes.InsertOneAsync(liane);
                        }
                    }
                }
                
                await lianeTrips.InsertOneAsync(lianeTrip);
            }
        }

        public async Task Delete(string lianeTripId)
        {
            
        }

        public async Task<ImmutableHashSet<Api.Trip.Liane>> Snap(LatLng center, TripFilter tripFilter)
        {
            return null;
        }
        
        public async Task<ImmutableHashSet<LianeTrip>> Get()
        {
            var result = await lianeTrips.FindAsync(new ExpressionFilterDefinition<UserLianeTrip>(l => l.User == currentContext.CurrentUser()));

            return result.ToEnumerable()
                .Select(l => new LianeTrip(l.Lianes
                    .Select(async id => await lianes.FindAsync(new ExpressionFilterDefinition<UsedLiane>(ul => ul.Id == id)))
                    .Select(r => r.Result)
                    .Where(i => i.Any())
                    .Select(i => i.First())
                    .Select(ul => new Api.Trip.Liane(ul.From, ul.To, new List<LianeUsage>()))
                    .ToList()
                )).ToImmutableHashSet();
        }

        public async Task Generate()
        {
            
        }

    }
}