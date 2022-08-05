using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.Grouping;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.RallyingPoints;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class TripIntentServiceImpl : ITripIntentService
{
    private readonly ICurrentContext currentContext;
    private readonly IMongoDatabase mongo;
    private readonly IRoutingService routingService;
    private readonly IRallyingPointService rallyingPointService;
    private readonly IIntentsMatchingService intentsMatchingService;

    private const int InterpolationRadius = 2_000; // Adaptable

    public TripIntentServiceImpl(MongoSettings settings, ICurrentContext currentContext, IRoutingService routingService, IRallyingPointService rallyingPointService,
        IIntentsMatchingService intentsMatchingService)
    {
        this.currentContext = currentContext;
        this.routingService = routingService;
        this.rallyingPointService = rallyingPointService;
        this.intentsMatchingService = intentsMatchingService;
        mongo = settings.GetDatabase();
    }

    public async Task<TripIntent> Create(TripIntent tripIntent)
    {
        var dbTripIntent = await LinkToPoints(tripIntent);
        var created = tripIntent with { Id = dbTripIntent.Id.ToString() };
        await mongo.GetCollection<DbTripIntent>().InsertOneAsync(dbTripIntent);

        await intentsMatchingService.UpdateTripGroups();

        return created;
    }

    private async Task<DbTripIntent> LinkToPoints(TripIntent ti)
    {
        LatLng start = ti.From.Location;
        LatLng end = ti.To.Location;

        // Get the shortest path (list of coordinates) calculated with OSRM
        var route = await routingService.BasicRouteMethod(new RoutingQuery(start, end));

        // Interpolate to find the RallyingPoints it passes by (< 1 km)
        var waySegments = new Dictionary<DbRallyingPoint, DbRallyingPoint>();

        DbRallyingPoint? previousPoint = null;
        foreach (var wp in route.Coordinates)
        {
            var (closestPoint, distance) = await FindClosest(new LatLng(wp.Lat, wp.Lng));

            if (distance < InterpolationRadius && !waySegments.ContainsKey(closestPoint))
            {
                if (previousPoint is not null)
                {
                    waySegments[previousPoint] = closestPoint;
                }

                waySegments.Add(closestPoint, null!); // The last segment will have the last point as key and null as value
                previousPoint = closestPoint;
            }
        }

        return new DbTripIntent(
            ObjectId.GenerateNewId(), ti.User,
            RallyingPointServiceImpl.ToDbRallyingPoint(ti.From), RallyingPointServiceImpl.ToDbRallyingPoint(ti.To),
            ti.FromTime, ti.ToTime,
            waySegments, ti.Title);
    }

    private async Task<(DbRallyingPoint point, double distance)> FindClosest(LatLng loc)
    {
        var rallyingPoints = (await rallyingPointService.List(loc, null));

        var i = 0;
        var closestPoint = rallyingPoints[i];
        var minDistance = closestPoint.Location.CalculateDistance(loc);

        i++;
        while (i < rallyingPoints.Count)
        {
            var currentDistance = rallyingPoints[i].Location.CalculateDistance(loc);
            if (currentDistance < minDistance)
            {
                minDistance = currentDistance;
                closestPoint = rallyingPoints[i];
            }

            i++;
        }

        return (RallyingPointServiceImpl.ToDbRallyingPoint(closestPoint), minDistance);
    }

    public async Task Delete(string id)
    {
        await mongo.GetCollection<DbTripIntent>().DeleteOneAsync(ti => ti.Id == ObjectId.Parse(id));
    }

    public async Task<ImmutableList<TripIntent>> List()
    {
        var filter = FilterDefinition<DbTripIntent>.Empty;

        var builder = Builders<DbTripIntent>.Filter;

        var currentUser = currentContext.CurrentUser();

        if (!currentUser.IsAdmin)
        {
            var regex = new Regex(Regex.Escape(currentUser.Phone), RegexOptions.None);
            filter &= builder.Regex(x => x.User, new BsonRegularExpression(regex));
        }

        var result = (await mongo.GetCollection<DbTripIntent>().FindAsync(filter))
            .ToEnumerable()
            .Select(ToTripIntent)
            .ToImmutableList();

        return result;
    }

    public static TripIntent ToTripIntent(DbTripIntent dbTripIntent)
    {
        return new TripIntent(dbTripIntent.Id.ToString(), dbTripIntent.User,
            RallyingPointServiceImpl.ToRallyingPoint(dbTripIntent.From), RallyingPointServiceImpl.ToRallyingPoint(dbTripIntent.To),
            dbTripIntent.FromTime, dbTripIntent.ToTime, null);
    }
}