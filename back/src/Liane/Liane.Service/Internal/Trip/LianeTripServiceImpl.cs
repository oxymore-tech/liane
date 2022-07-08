using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Location;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

public class LianeTripServiceImpl : ILianeTripService
{
    private const int DeltaTimeTrip = 1000 * 60 * 30; // 30 minutes gap = two different trips
    private const int DeltaMTrip = 1000 * 5; // 5 000 m gap = two different trips
    private const int MinDistTrip = 1000; // Less than 1 000 m isn't a trip
    private const int MinLocTrip = 2; // Less than 2 loc isn't a trip
    private const int MinLianeTrip = 1; // Less than 1 liane isn't a trip
    private const int SelectionRadius = 25_000;

    private readonly IMongoDatabase mongo;
    private readonly ICurrentContext currentContext;
    private readonly ILogger<LianeTripServiceImpl> logger;
    private readonly IRallyingPointService rallyingPointService;
    private readonly IRoutingService routingService;

    public LianeTripServiceImpl(
        MongoSettings settings,
        ICurrentContext currentContext, ILogger<LianeTripServiceImpl> logger,
        IRallyingPointService rallyingPointService, IRoutingService routingService
    )
    {
        this.currentContext = currentContext;
        this.logger = logger;
        this.rallyingPointService = rallyingPointService;
        this.routingService = routingService;

        mongo = settings.GetDatabase();
    }

    public async Task Create(string user, ImmutableList<UserLocation> userLocations)
    {
        var trips = SplitTrip(userLocations)
            .Where(l => l.Count >= MinLocTrip)
            .Where(l => l[0].ToLatLng().CalculateDistance(l[^1].ToLatLng()) >= MinDistTrip);

        foreach (var trip in trips)
        {
            var rallyingPoints = await rallyingPointService.Interpolate(trip.Select(t => t.ToLatLng()).ToImmutableList());
            await CreateLianeTrip(user, trip.First().Timestamp, rallyingPoints);
        }
    }

    public async Task Delete(string lianeTripId)
    {
        // TODO : will need a review
        var result = await (await mongo.GetCollection<UserLianeTrip>().FindAsync(l => l.Id == ObjectId.Parse(lianeTripId) && l.User == currentContext.CurrentUser().Phone)).ToListAsync();

        if (result.Any())
        {
            var lianeTrip = result.First();
            var filterBuilder = new FilterDefinitionBuilder<UsedLiane>();

            await mongo.GetCollection<UsedLiane>().UpdateManyAsync(
                filterBuilder.In(l => l.Id, lianeTrip.Lianes),
                Builders<UsedLiane>.Update.PullFilter(
                    l => l.Usages,
                    u => u.TripId == lianeTrip.Id
                )
            );
        }

        await mongo.GetCollection<UserLianeTrip>().DeleteOneAsync(l => l.Id == ObjectId.Parse(lianeTripId) && l.User == currentContext.CurrentUser().Phone);
    }

    public async Task<ImmutableHashSet<Api.Trip.Liane>> Get()
    {
        // Select the user trips
        var currentUser = currentContext.CurrentUser();
        var trips = (await mongo.GetCollection<UserLianeTrip>().FindAsync(l => l.User == currentUser.Phone)).ToEnumerable();

        // Fin every liane id
        var lianesIds = trips.SelectMany(t => t.Lianes).ToImmutableHashSet();

        // Select the corresponding lianes
        var filterBuilder = new FilterDefinitionBuilder<UsedLiane>();
        var lianesList = (await mongo.GetCollection<UsedLiane>().FindAsync(filterBuilder.In(l => l.Id, lianesIds))).ToEnumerable();

        // Convert the lianes and order them
        return lianesList.Select(ul => ul.ToLiane()).OrderBy(l => l.Usages.Count).ToImmutableHashSet();
    }

    public async Task<ImmutableHashSet<RoutedLiane>> Snap(TripFilter tripFilter)
    {
        // Select the data using geo. location of mongo
        var point = GeoJson.Point(new GeoJson2DGeographicCoordinates(tripFilter.Center.Lng, tripFilter.Center.Lat));
        var filter = Builders<UsedLiane>.Filter.Near(x => x.Location, point, SelectionRadius);
        var lianesList = (await mongo.GetCollection<UsedLiane>().FindAsync(filter)).ToEnumerable();

        // Keep primary ones
        // No, don't do that, else the search engine will not work
        // lianesList = lianesList.Where(l => l.Usages.Any(u => u.IsPrimary));

        // Filter the data regarding the position
        if (tripFilter.From is not null)
        {
            lianesList = lianesList.Where(l => l.From.Id == tripFilter.From.Id);
        }

        if (tripFilter.To is not null)
        {
            lianesList = lianesList.Where(l => l.To.Id == tripFilter.To.Id);
        }

        // Filter the data regarding the date
        if (tripFilter.dayFrom is not null && tripFilter.dayTo is not null)
        {
            lianesList = lianesList.Where(l =>
            {
                var usagesDates = l.Usages.Select(u => DateTimeOffset.FromUnixTimeMilliseconds(u.Timestamp).DateTime);
                return usagesDates.Any(d => (int)d.DayOfWeek >= tripFilter.dayFrom && (int)d.DayOfWeek <= tripFilter.dayTo);
            });
        }

        // Filter the data regarding the time
        if (tripFilter.hourFrom is not null && tripFilter.hourTo is not null)
        {
            lianesList = lianesList.Where(l =>
            {
                var usagesDates = l.Usages.Select(u => DateTimeOffset.FromUnixTimeMilliseconds(u.Timestamp).DateTime);
                return usagesDates.Any(d => d.Hour >= tripFilter.hourFrom && d.Hour <= tripFilter.hourTo);
            });
        }

        var list = lianesList
            .Select(async l =>
                new RoutedLiane(
                    l.From,
                    l.To,
                    l.Usages.Count,
                    true, // Automatically primary as other were filtered out
                    await routingService.BasicRouteMethod(new RoutingQuery(l.From.Location, l.To.Location))))
            .Select(t => t.Result)
            .ToImmutableHashSet();

        return list;
    }

    public async Task Generate()
    {
        // Delete the previous data
        await mongo.GetCollection<UsedLiane>().DeleteManyAsync(_ => true);
        await mongo.GetCollection<UserLianeTrip>().DeleteManyAsync(_ => true);
        
        // Fetch raw locations
        var rawTripCollection = mongo.GetCollection<UserRawTrip>(MongoKeys.RawTrip());
        var result = (await rawTripCollection.FindAsync(_ => true)).ToList();

        logger.LogInformation(result.Count + " raw trips founded");

        // Compute the data
        foreach (var (_, user, locations) in result)
        {
            logger.LogInformation(locations.Count + " locations");
            await Create(user, locations.ToImmutableList());
        }
    }

    public async Task<LianeStats> Stats()
    {
        return new LianeStats(
            await mongo.GetCollection<UsedLiane>().CountDocumentsAsync(_ => true),
            (await (await mongo.GetCollection<UserLianeTrip>().DistinctAsync<string>("User", FilterDefinition<UserLianeTrip>.Empty)).ToListAsync()).Count
        );
    }
    
    private static IEnumerable<ImmutableList<UserLocation>> SplitTrip(ImmutableList<UserLocation> trip)
    {
        List<UserLocation> currentTrip = new();
        var previousIndex = -1;

        foreach (var current in trip.OrderBy(u => u.Timestamp))
        {
            if (previousIndex < 0)
            {
                currentTrip.Add(current);
                previousIndex++;
            }
            else
            {
                var previous = currentTrip[previousIndex];

                if (IsPartOfSameTrip(previous, current))
                {
                    currentTrip.Add(current);
                    previousIndex++;
                }
                else
                {
                    yield return currentTrip.ToImmutableList();
                    currentTrip = new List<UserLocation> { current };
                    previousIndex = -1;
                }
            }
        }
    }

    private static bool IsPartOfSameTrip(UserLocation previous, UserLocation current)
    {
        var time = current.Timestamp - previous.Timestamp <= DeltaTimeTrip;
        var distance = previous.ToLatLng().CalculateDistance(current.ToLatLng()) <= DeltaMTrip;
        return time && distance;
    }
    
    private async Task CreateLianeTrip(string user, long timestamp, ImmutableList<RallyingPoint> rallyingPoints)
    {
        var id = ObjectId.GenerateNewId();
        var lianeTrip = new UserLianeTrip(id, user, timestamp, new List<ObjectId>());
        var lianesIds = await CreateLianes(user, id, rallyingPoints, timestamp);

        if (lianesIds.Count >= MinLianeTrip)
        {
            lianeTrip.Lianes.AddRange(lianesIds);
            await mongo.GetCollection<UserLianeTrip>().InsertOneAsync(lianeTrip);
        }
    }

    private async Task<ImmutableList<ObjectId>> CreateLianes(string user, ObjectId lianeTripId, ImmutableList<RallyingPoint> rallyingPoints, long timestamp)
    {
        var lianesIds = ImmutableList.CreateBuilder<ObjectId>();

        // Create the rallying points pairs
        foreach (var from in rallyingPoints.SkipLast(1).Select((r, i) => new { r, i }))
        {
            var isPrimary = true;

            foreach (var to in rallyingPoints.Skip(from.i + 1))
            {
                var results = await (await mongo.GetCollection<UsedLiane>().FindAsync(l => l.From == from.r && l.To == to)).ToListAsync();
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

        liane.Usages.Add(lianeUsage);

        await mongo.GetCollection<UsedLiane>().InsertOneAsync(liane);

        // logger.LogInformation("Liane created : " + liane.ToJson());
    }

    private async Task UpdateLiane(ObjectId id, UserLianeUsage lianeUsage)
    {
        await mongo.GetCollection<UsedLiane>().UpdateOneAsync(l => l.Id == id, Builders<UsedLiane>.Update.AddToSet(l => l.Usages, lianeUsage));
        // logger.LogInformation("Liane updated : " + id);
    }
}