using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Location;
using Liane.Api.Routing;
using Liane.Api.Trip;
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
        
        private const int MinLocTrip = 2; // Less than 2 loc isn't a trip
        private const int MinDistRallyingPoint = 1000; // 500 m

        private readonly IRedis redis;
        private readonly MongoClient mongo;
        private readonly ICurrentContext currentContext;
        private readonly ILogger<LianeTripServiceImpl> logger;
        private readonly IRallyingPointService rallyingPointService;

        private readonly IMongoCollection<UsedLiane> lianes;
        private readonly IMongoCollection<UserLianeTrip> lianeTrips;

        public LianeTripServiceImpl(IRedis redis, MongoSettings settings, ICurrentContext currentContext, ILogger<LianeTripServiceImpl> logger, IRallyingPointService rallyingPointService)
        {
            this.redis = redis;
            this.currentContext = currentContext;
            this.logger = logger;
            this.rallyingPointService = rallyingPointService;

            mongo = new MongoClient(new MongoClientSettings
            {
                Server = new MongoServerAddress(settings.Host, 27017),
                Credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password)
            });
            
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
                
                logger.LogInformation("New trip created : " + lianeTrip.ToJson());

                await lianeTrips.InsertOneAsync(lianeTrip);
            }
        }

        public async Task Delete(string lianeTripId)
        {
            var result = await lianeTrips.FindAsync(l => l.Id == ObjectId.Parse(lianeTripId) && l.User == currentContext.CurrentUser());

            if (await result.AnyAsync())
            {
                var lianeTrip = result.ToEnumerable().First();
                var filterBuilder = new FilterDefinitionBuilder<UsedLiane>();
                
                await lianes.UpdateManyAsync(
                    filterBuilder.In(l => l.Id, lianeTrip.Lianes), 
                    Builders<UsedLiane>.Update.PullFilter(
                        l => l.Usages, 
                        u => u.TripId == lianeTrip.Id
                        )
                    );
            }

            await lianeTrips.DeleteOneAsync(l => l.Id == ObjectId.Parse(lianeTripId) && l.User == currentContext.CurrentUser());
        }
        
        public async Task<ImmutableHashSet<LianeTrip>> Get()
        {
            // var result = await lianeTrips.FindAsync(new ExpressionFilterDefinition<UserLianeTrip>(l => l.User == currentContext.CurrentUser()));
            //
            // return result.ToEnumerable()
            //     .Select(l => new LianeTrip(l.Timestamp, 
            //         l.Lianes
            //             .Select(async id => await lianes.FindAsync(new ExpressionFilterDefinition<UsedLiane>(ul => ul.Id == id)))
            //             .Select(r => r.Result)
            //             .Where(i => i.Any())
            //             .Select(i => i.First())
            //             .Select(ul => new Api.Trip.Liane(ul.From, ul.To, new List<LianeUsage>()))
            //             .ToList()
            //     )).ToImmutableHashSet();
            return null;
        }

        public async Task<ImmutableHashSet<Api.Trip.Liane>> Snap(TripFilter tripFilter)
        {
            // Select the data using redis
            var db = await redis.Get();
            var result = await db.GeoRadiusAsync(RedisKeys.Liane(), tripFilter.Center.Lng, tripFilter.Center.Lat, 50, GeoUnit.Kilometers, order: Order.Ascending, options: GeoRadiusOptions.WithDistance);
            var lianesIds = result.Select(r => ObjectId.Parse(r.Member)).ToImmutableList();
            
            // Select the corresponding data using mongo
            var filterBuilder = new FilterDefinitionBuilder<UsedLiane>();
            var lianesList = (await lianes.FindAsync(filterBuilder.In(l => l.Id, lianesIds))).ToEnumerable();
                
            // Filter out the data regarding the position
            if (tripFilter.From is not null)
            {
                lianesList = lianesList.Where(l => l.From.Id == tripFilter.From.Id);
            }

            if (tripFilter.To is not null)
            {
                lianesList = lianesList.Where(l => l.To.Id == tripFilter.To.Id);
            }
            
            // Filter out the data regarding the date and time
            if (tripFilter.TimestampFrom is not null)
            {
                var from = DateTimeOffset.FromUnixTimeMilliseconds(tripFilter.TimestampFrom ?? 0).DateTime;
                
                lianesList = lianesList.Where(l => 
                {
                    var usagesDates = l.Usages.Select(u => DateTimeOffset.FromUnixTimeMilliseconds(u.Timestamp).DateTime);
                    return usagesDates.Any(d => d.DayOfWeek == from.DayOfWeek && (!tripFilter.WithHour || d.Hour == from.Hour));
                });
            }

            if (tripFilter.TimestampTo is not null)
            {
                // Unused at the moment, needs to rework the previous filter.
                // At the moment, we only search for a specific time during
                // a specific day and not a time span.
            }

            return lianesList.Select(l => l.ToLiane()).ToImmutableHashSet();
        }

        public async Task Generate()
        {
            try
            {
                var database = mongo.GetDatabase(DatabaseKey);
                var collection = database.GetCollection<UserRawTrip>("raw_trips");
                var result = (await collection.FindAsync(new ExpressionFilterDefinition<UserRawTrip>(u => u.UserId == currentContext.CurrentUser()))).ToList();
                var rallyingPointsTrips = ImmutableHashSet.CreateBuilder<(ImmutableHashSet<RallyingPoint>, long)>();

                foreach (var userRawTrip in result)
                {
                    if (userRawTrip.Locations.Count < MinLocTrip) continue;

                    var rallyingPoints = await CreateRallyingPoints(userRawTrip.Locations.ToImmutableList());
                    rallyingPointsTrips.Add((rallyingPoints, userRawTrip.Locations.First().Timestamp));
                }

                await Create(rallyingPointsTrips.ToImmutable());
            }
            catch (Exception e)
            {
                logger.LogError(e.Message);
                logger.LogError(e.StackTrace);
            }
            
        }
        
        private async Task<ImmutableHashSet<RallyingPoint>> CreateRallyingPoints(ImmutableList<UserLocation> trip)
        {
            var rallyingPoints = ImmutableHashSet.CreateBuilder<RallyingPoint>();

            foreach (var l in trip)
            {
                var result = await rallyingPointService.GetOneClosest(RedisKeys.RallyingPoint(), l.Longitude, l.Latitude, MinDistRallyingPoint, GeoUnit.Meters);

                if (result is null || result.Value.Position is null) continue;
                
                var r = result.Value;
                var p = r.Position!.Value;
                rallyingPoints.Add(new RallyingPoint(r.Member, new LatLng(p.Latitude, p.Longitude), r.Member));
            }

            return rallyingPoints.ToImmutable();
        }

        private async Task<ImmutableList<ObjectId>> CreateLianes(ObjectId lianeTripId, ImmutableHashSet<RallyingPoint> rallyingPoints, long timestamp)
        {
            var lianesIds = ImmutableList.CreateBuilder<ObjectId>();
            
            // Create the rallying points pairs
            foreach (var from in rallyingPoints.SkipLast(1).Select((r, i) => new { r, i }))
            {
                var isPrimary = true;
                    
                foreach (var to in rallyingPoints.Skip(from.i + 1))
                {
                    var results = await lianes.FindAsync(l => l.From == from.r && l.To == to);
                    var lianeUsage = new UserLianeUsage(currentContext.CurrentUser(), isPrimary, timestamp, lianeTripId);
                    ObjectId lianeId;

                    if (await results.AnyAsync()) // The liane already exists, add an usage
                    {
                        lianeId = results.First().Id;
                        await UpdateLiane(lianeId, lianeUsage);
                    }
                    else // The liane doesn't exists, create it
                    {
                        lianeId = ObjectId.GenerateNewId();
                        await CreateLiane(lianeId, from.r, to, lianeUsage);
                    }
                    
                    lianesIds.Add(lianeId);
                    isPrimary = false;
                }
            }

            return lianesIds.ToImmutable();
        }

        private async Task CreateLiane(ObjectId id, RallyingPoint from, RallyingPoint to, UserLianeUsage lianeUsage)
        {
            var liane = new UsedLiane(id, from, to, new List<UserLianeUsage>());
            var database = await redis.Get();
            
            liane.Usages.Add(lianeUsage);

            database.GeoAdd(RedisKeys.Liane(), from.Position.Lat, from.Position.Lng, liane.Id.ToString());
            await lianes.InsertOneAsync(liane);
            
            logger.LogInformation("Liane created : " + liane.ToJson());
        }

        private async Task UpdateLiane(ObjectId id, UserLianeUsage lianeUsage)
        {
            await lianes.UpdateOneAsync(l => l.Id == id, Builders<UsedLiane>.Update.AddToSet(l => l.Usages, lianeUsage));
            logger.LogInformation("Liane updated : " + id);
        }

    }
}