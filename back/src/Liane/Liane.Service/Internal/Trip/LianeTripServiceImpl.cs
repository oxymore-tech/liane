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
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

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
        
        private readonly IMongoCollection<UsedLiane> lianes;
        private readonly IMongoCollection<UserLianeTrip> lianeTrips;

        public LianeTripServiceImpl(IRedis redis, MongoClient mongo, ICurrentContext currentContext, ILogger<LianeTripServiceImpl> logger)
        {
            this.redis = redis;
            this.mongo = mongo;
            this.currentContext = currentContext;
            this.logger = logger;
            
            var database = mongo.GetDatabase(DatabaseKey);
            lianes = database.GetCollection<UsedLiane>(LianeCollectionKey);
            lianeTrips = database.GetCollection<UserLianeTrip>(LianeTripCollectionKey);
        }
        
        public async Task Create(ImmutableHashSet<(ImmutableHashSet<RallyingPoint> rallyingPoints, long timestamp)> rallyingPointsTrips)
        {
            // Iterate over the hashset
            foreach (var (rallyingPoints, timestamp) in rallyingPointsTrips)
            {
                var id = ObjectId.GenerateNewId();
                var lianeTrip = new UserLianeTrip(id, currentContext.CurrentUser(), timestamp, new List<ObjectId>());
                var lianesIds = await CreateLianes(id, rallyingPoints, timestamp);
                
                lianeTrip.Lianes.AddRange(lianesIds);
                
                await lianeTrips.InsertOneAsync(lianeTrip);
            }
        }

        public async Task Delete(string lianeTripId)
        {
            var result = await lianeTrips.FindAsync(new ExpressionFilterDefinition<UserLianeTrip>(l => l.Id == ObjectId.Parse(lianeTripId) && l.User == currentContext.CurrentUser()));

            if (await result.AnyAsync())
            {
                var lianeTrip = result.ToEnumerable().First();
                await lianeUsages.DeleteManyAsync(new ExpressionFilterDefinition<UserLianeUsage>(l => lianeTrip.Lianes.Contains(l.Liane) && l.Timestamp == lianeTrip.Timestamp && l.User == currentContext.CurrentUser()));
            }
            
            await lianeTrips.DeleteOneAsync(new ExpressionFilterDefinition<UserLianeTrip>(l => l.Id == ObjectId.Parse(lianeTripId) && l.User == currentContext.CurrentUser()));
        }
        
        public async Task<ImmutableHashSet<LianeTrip>> Get()
        {
            var result = await lianeTrips.FindAsync(new ExpressionFilterDefinition<UserLianeTrip>(l => l.User == currentContext.CurrentUser()));

            return result.ToEnumerable()
                .Select(l => new LianeTrip(l.Timestamp, 
                    l.Lianes
                        .Select(async id => await lianes.FindAsync(new ExpressionFilterDefinition<UsedLiane>(ul => ul.Id == id)))
                        .Select(r => r.Result)
                        .Where(i => i.Any())
                        .Select(i => i.First())
                        .Select(ul => new Api.Trip.Liane(ul.From, ul.To, new List<LianeUsage>()))
                        .ToList()
                )).ToImmutableHashSet();
        }

        public async Task<ImmutableHashSet<Api.Trip.Liane>> Snap(LatLng center, TripFilter tripFilter)
        {
            // Select the data using redis
            var db = await redis.Get();
            var result = await db.GeoRadiusAsync(RedisKeys.Liane(), center.Lng, center.Lat, 50, GeoUnit.Kilometers, order: Order.Ascending, options: GeoRadiusOptions.WithDistance);
            var lianesIds = result.Select(r => ObjectId.Parse(r.Member)).ToImmutableList();
            
            // Select the corresponding data using mongo
            var filterBuilder = new FilterDefinitionBuilder<UsedLiane>();
            var lianesList = (await lianes.FindAsync(filterBuilder.In(l => l.Id, lianesIds))).ToEnumerable();
                
            // Filter out the data regarding the filter
            if (tripFilter.From is not null)
            {
                lianesList = lianesList.Where(l => l.From.Id == tripFilter.From.Id);
            }

            if (tripFilter.To is not null)
            {
                lianesList = lianesList.Where(l => l.To.Id == tripFilter.To.Id);
            }

            if (tripFilter.TimestampFrom is not null)
            {
                
            }

            if (tripFilter.TimestampTo is not null)
            {
                
            }
            
            // Select the usages

            return null;
        }

        public async Task Generate()
        {
            
        }

        private async Task<ImmutableList<ObjectId>> CreateLianes(ObjectId lianeTrip, ImmutableHashSet<RallyingPoint> rallyingPoints, long timestamp)
        {
            List<ObjectId> lianesIds = new();
            
            // Create the rallying points pairs
            foreach (var from in rallyingPoints.SkipLast(1).Select((r, i) => new { r, i }))
            {
                var isPrimary = true;
                    
                foreach (var to in rallyingPoints.Skip(from.i + 1))
                {
                    var results = await lianes.FindAsync(new ExpressionFilterDefinition<UsedLiane>(l => l.From == from.r && l.To == to));

                    if (await results.AnyAsync()) // The liane already exists, add an usage
                    {
                        var liane = results.First();
                        var lianeUsage = new UserLianeUsage(currentContext.CurrentUser(), isPrimary, timestamp);
                            
                        lianesIds.Add(liane.Id);
                            
                        await lianes.UpdateOneAsync(l => l.Id == liane.Id, Builders<UsedLiane>.Update.AddToSet(l => l.Usages, lianeUsage));
                    }
                    else // The liane doesn't exists, create it
                    {
                        var liane = new UsedLiane(ObjectId.GenerateNewId(), from.r, to, new List<UserLianeUsage>());
                        var lianeUsage = new UserLianeUsage(currentContext.CurrentUser(), isPrimary, timestamp);
                        var database = await redis.Get();
                            
                        lianesIds.Add(liane.Id);
                        liane.Usages.Add(lianeUsage);

                        database.GeoAdd(RedisKeys.Liane(), from.r.Position.Lat, from.r.Position.Lng, liane.Id.ToString());
                        await lianes.InsertOneAsync(liane);
                    }

                    isPrimary = false;
                }
            }

            return lianesIds.ToImmutableList();
        }

    }
}