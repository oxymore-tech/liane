using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Location;
using Liane.Api.Routing;
using Liane.Api.Rp;
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
        private const int MinLianeTrip = 1; // Less than 1 liane isn't a trip
        private const int MinDistRallyingPoint = 1000; // 500 m

        private readonly IRedis redis;
        private readonly MongoClient mongo;
        private readonly ICurrentContext currentContext;
        private readonly ILogger<LianeTripServiceImpl> logger;
        private readonly IRallyingPointService rallyingPointService;
        private readonly IRoutingService routingService;

        private readonly IMongoCollection<UsedLiane> lianesCollection;
        private readonly IMongoCollection<UserLianeTrip> lianeTripsCollection;

        public LianeTripServiceImpl(
            IRedis redis, MongoSettings settings, 
            ICurrentContext currentContext, ILogger<LianeTripServiceImpl> logger, 
            IRallyingPointService rallyingPointService, IRoutingService routingService
            )
        {
            this.redis = redis;
            this.currentContext = currentContext;
            this.logger = logger;
            this.rallyingPointService = rallyingPointService;
            this.routingService = routingService;

            mongo = new MongoClient(new MongoClientSettings
            {
                Server = new MongoServerAddress(settings.Host, 27017),
                Credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password)
            });
            
            var database = mongo.GetDatabase(DatabaseKey);
            lianesCollection = database.GetCollection<UsedLiane>(LianeCollectionKey);
            lianeTripsCollection = database.GetCollection<UserLianeTrip>(LianeTripCollectionKey);
        }
        
        /**
         * Constructor for test purposes.
         */
        public LianeTripServiceImpl(
            IRedis redis, MongoClient mongo, 
            ICurrentContext currentContext, ILogger<LianeTripServiceImpl> logger, 
            IRallyingPointService rallyingPointService, IRoutingService routingService
        )
        {
            this.redis = redis;
            this.currentContext = currentContext;
            this.logger = logger;
            this.rallyingPointService = rallyingPointService;
            this.routingService = routingService;
            this.mongo = mongo;
            
            var database = mongo.GetDatabase(DatabaseKey);
            lianesCollection = database.GetCollection<UsedLiane>(LianeCollectionKey);
            lianeTripsCollection = database.GetCollection<UserLianeTrip>(LianeTripCollectionKey);
        }
        
        public async Task Create(ImmutableHashSet<(ImmutableHashSet<RallyingPoint> rallyingPoints, long timestamp)> rallyingPointsTrips)
        {
            await CreateFor(currentContext.CurrentUser(), rallyingPointsTrips);
        }

        public async Task Delete(string lianeTripId)
        {
            var result = await (await lianeTripsCollection.FindAsync(l => l.Id == ObjectId.Parse(lianeTripId) && l.User == currentContext.CurrentUser())).ToListAsync();

            if (result.Any())
            {
                var lianeTrip = result.First();
                var filterBuilder = new FilterDefinitionBuilder<UsedLiane>();
                
                await lianesCollection.UpdateManyAsync(
                    filterBuilder.In(l => l.Id, lianeTrip.Lianes), 
                    Builders<UsedLiane>.Update.PullFilter(
                        l => l.Usages, 
                        u => u.TripId == lianeTrip.Id
                        )
                    );
            }

            await lianeTripsCollection.DeleteOneAsync(l => l.Id == ObjectId.Parse(lianeTripId) && l.User == currentContext.CurrentUser());
        }
        
        public async Task<ImmutableHashSet<Api.Trip.Liane>> Get()
        {
            // Select the user trips
            var currentUser = currentContext.CurrentUser();
            var trips = (await lianeTripsCollection.FindAsync(l => l.User == currentUser)).ToEnumerable();
            
            // Fin every liane id
            var lianesIds = trips.SelectMany(t => t.Lianes).ToImmutableHashSet();
            
            // Select the corresponding lianes
            var filterBuilder = new FilterDefinitionBuilder<UsedLiane>();
            var lianesList = (await lianesCollection.FindAsync(filterBuilder.In(l => l.Id, lianesIds))).ToEnumerable();
            
            // Convert the lianes and order them
            return lianesList.Select(ul => ul.ToLiane()).OrderBy(l => l.Usages.Count).ToImmutableHashSet();
        }

        public async Task<ImmutableHashSet<RoutedLiane>> Snap(TripFilter tripFilter)
        {
            // Select the data using redis
            var db = await redis.Get();
            var result = await db.GeoRadiusAsync(RedisKeys.Liane(), tripFilter.Center.Lng, tripFilter.Center.Lat, 25, GeoUnit.Kilometers, order: Order.Ascending, options: GeoRadiusOptions.WithDistance);
            var lianesIds = result.Select(r => ObjectId.Parse(r.Member.ToString())).ToImmutableList();

            // Select the corresponding data
            var filterBuilder = new FilterDefinitionBuilder<UsedLiane>();
            var lianesList = (await lianesCollection.FindAsync(filterBuilder.In(l => l.Id, lianesIds))).ToEnumerable();
            
            // Only keep primary ones
            lianesList = lianesList.Where(l => l.Usages.Any(u => u.IsPrimary));

            // Filter the data regarding the position
            if (tripFilter.From is not null)
            {
                lianesList = lianesList.Where(l => l.From.Id.Equals(tripFilter.From.Id));
            }

            if (tripFilter.To is not null)
            {
                lianesList = lianesList.Where(l => l.To.Id.Equals(tripFilter.To.Id));
            }

            // Filter the data regarding the date
            if (tripFilter.dayFrom is not null && tripFilter.dayTo is not null)
            {
                logger.LogError("from " + tripFilter.dayFrom + " to " + tripFilter.dayTo);
                
                lianesList = lianesList.Where(l =>
                {
                    var usagesDates = l.Usages.Select(u => DateTimeOffset.FromUnixTimeMilliseconds(u.Timestamp).DateTime);
                    return usagesDates.Any(d => (int) d.DayOfWeek >= tripFilter.dayFrom && (int) d.DayOfWeek <= tripFilter.dayTo);
                });
            }
            
            // Filter the data regarding the time
            if (tripFilter.hourFrom is not null && tripFilter.hourTo is not null)
            {
                logger.LogError("from " + tripFilter.hourFrom + " to " + tripFilter.hourTo);
                
                lianesList = lianesList.Where(l =>
                {
                    var usagesDates = l.Usages.Select(u => DateTimeOffset.FromUnixTimeMilliseconds(u.Timestamp).DateTime);
                    return usagesDates.Any(d => d.Hour >= tripFilter.hourFrom && d.Hour <= tripFilter.hourTo);
                }).ToList();
            }

            var list = lianesList
                .Select(async l =>
                    new RoutedLiane(
                        l.From,
                        l.To,
                        l.Usages.Count,
                        true, // Automatically primary as other were filtered out
                        await routingService.BasicRouteMethod(new RoutingQuery(l.From.Position, l.To.Position))))
                .Select(t => t.Result)
                .ToImmutableHashSet();

            return list;
        }

        public async Task Generate()
        {
            var database = mongo.GetDatabase(DatabaseKey);

            // Delete the previous data
            var lianeCollection = database.GetCollection<UsedLiane>(LianeCollectionKey);
            var lianeTripCollection = database.GetCollection<UserLianeTrip>(LianeTripCollectionKey);
            await lianeCollection.DeleteManyAsync(_ => true);
            await lianeTripCollection.DeleteManyAsync(_ => true);
            
            // Fetch raw locations
            var rawTripCollection = database.GetCollection<UserRawTrip>("raw_trips");
            var result = (await rawTripCollection.FindAsync(_ => true)).ToList();

            // Order by user
            var userTrips = new Dictionary<string, ImmutableHashSet<(ImmutableHashSet<RallyingPoint>, long)>.Builder>();
            
            logger.LogInformation(result.Count + " raw trips founded");
            
            // Compute the data
            foreach (var (_, user, locations) in result)
            {
                logger.LogInformation(locations.Count + " locations");

                if (locations.Count < MinLocTrip) continue;
                
                var rallyingPoints = await CreateRallyingPoints(locations.ToImmutableList());

                userTrips.TryAdd(user, ImmutableHashSet.CreateBuilder<(ImmutableHashSet<RallyingPoint>, long)>());
                userTrips[user].Add((rallyingPoints, locations.First().Timestamp)); // Will never be null
            }

            foreach (var (user, trips) in userTrips)
            {
                await CreateFor(user, trips.ToImmutable());
            }
        }

        public async Task<LianeStats> Stats()
        {
            return new (
                await lianesCollection.CountDocumentsAsync(_ => true),
                (await (await lianeTripsCollection.DistinctAsync<string>("User", FilterDefinition<UserLianeTrip>.Empty)).ToListAsync()).Count
            );
        }
        
        private async Task CreateFor(string user, ImmutableHashSet<(ImmutableHashSet<RallyingPoint> rallyingPoints, long timestamp)> rallyingPointsTrips)
        {
            // Iterate over the hashset
            foreach (var (rallyingPoints, timestamp) in rallyingPointsTrips)
            {
                var id = ObjectId.GenerateNewId();
                var lianeTrip = new UserLianeTrip(id, user, timestamp, new List<ObjectId>());
                var lianesIds = await CreateLianes(user, id, rallyingPoints, timestamp);

                if (lianesIds.Count < MinLianeTrip) continue;
                
                lianeTrip.Lianes.AddRange(lianesIds);
                logger.LogInformation("New trip created : " + lianeTrip.ToJson());
                await lianeTripsCollection.InsertOneAsync(lianeTrip);
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

        private async Task<ImmutableList<ObjectId>> CreateLianes(string user, ObjectId lianeTripId, ImmutableHashSet<RallyingPoint> rallyingPoints, long timestamp)
        {
            var lianesIds = ImmutableList.CreateBuilder<ObjectId>();
            
            // Create the rallying points pairs
            foreach (var from in rallyingPoints.SkipLast(1).Select((r, i) => new { r, i }))
            {
                var isPrimary = true;
                    
                foreach (var to in rallyingPoints.Skip(from.i + 1))
                {
                    var results = await (await lianesCollection.FindAsync(l => l.From == from.r && l.To == to)).ToListAsync();
                    var first = results.FirstOrDefault();
                    var lianeUsage = new UserLianeUsage(user, isPrimary, timestamp, lianeTripId);
                    ObjectId lianeId;

                    if (first is not null) // The liane already exists, add an usage
                    {
                        lianeId = first.Id;
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
            
            database.GeoAdd(RedisKeys.Liane(), from.Position.Lng, from.Position.Lat, liane.Id.ToString());
            await lianesCollection.InsertOneAsync(liane);
            
            logger.LogInformation("Liane created : " + liane.ToJson());
        }

        private async Task UpdateLiane(ObjectId id, UserLianeUsage lianeUsage)
        {
            await lianesCollection.UpdateOneAsync(l => l.Id == id, Builders<UsedLiane>.Update.AddToSet(l => l.Usages, lianeUsage));
            logger.LogInformation("Liane updated : " + id);
        }

    }
}