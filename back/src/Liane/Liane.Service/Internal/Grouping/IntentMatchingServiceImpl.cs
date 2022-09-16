using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.Grouping;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Util;
using MongoDB.Driver;

namespace Liane.Service.Internal.Grouping;

public class IntentMatchingServiceImpl : IIntentMatchingService
{
    private readonly IMongoDatabase mongo;
    private readonly ICurrentContext currentContext;
    private readonly IRoutingService routingService;
    private readonly IRallyingPointService rallyingPointService;
    private const int InterpolationRadius = 2_000; // Adaptable

    public IntentMatchingServiceImpl(MongoSettings settings, ICurrentContext currentContext, IRoutingService routingService, IRallyingPointService rallyingPointService)
    {
        this.currentContext = currentContext;
        this.routingService = routingService;
        this.rallyingPointService = rallyingPointService;
        mongo = settings.GetDatabase();
    }

    public async Task<List<MatchedTripIntent>> GetMatchedGroups()
    {
        var myGroups = new List<MatchedTripIntent>();
        var user = currentContext.CurrentUser().Phone;
        var tripIntents = (await mongo.GetCollection<DbTripIntent>()
                .FindAsync(e => true))
            .ToList();
        var intentGroups = await Group(tripIntents.ToImmutableList());

        foreach (var group in intentGroups)
        {
            var members = new List<string>();
            TripIntent? tripIntent = null;
            RallyingPoint? p1 = null;
            RallyingPoint? p2 = null;

            var foundGroup = false;
            foreach (var intent in group)
            {
                if (intent.TripIntent.User == user)
                {
                    tripIntent = TripIntentServiceImpl.ToTripIntent(intent.TripIntent);
                    p1 = intent.P1;
                    p2 = intent.P2;
                    foundGroup = true;
                }

                members.Add(intent.TripIntent.Id.ToString()!);
            }

            if (foundGroup)
            {
                myGroups.Add(new MatchedTripIntent(tripIntent!, p1!, p2!, members));
            }
        }

        return myGroups;
    }

    internal async Task<ImmutableList<ImmutableList<ProcessedTripIntent>>> Group(ImmutableList<DbTripIntent> tripIntents)
    {
        // Select all possible pair of points for each trip
        var processedTripIntents = new List<ProcessedTripIntent>();
        foreach (var tripIntent in tripIntents)
        {
            var from = await rallyingPointService.Get(tripIntent.From);
            var to = await rallyingPointService.Get(tripIntent.To);

            var wayPoints = await GetWayPoints(from, to);
            var cartesianProcessedTripIntents =
                from p1 in wayPoints
                from p2 in wayPoints
                where p1.Order < p2.Order
                select new ProcessedTripIntent(tripIntent, p1.RallyingPoint, p2.RallyingPoint);

            processedTripIntents.AddRange(cartesianProcessedTripIntents);
        }

        // Group the trips based on 2 points
        var groups =
            from tripTo2Points in processedTripIntents
            group tripTo2Points by new { p1 = tripTo2Points.P1.Id, p2 = tripTo2Points.P2.Id }
            into tripGroup
            where tripGroup.ToList().Count > 1 // Do not match the trip with itself
            select tripGroup.ToList();

        // Group based on the flow direction of the trips
        var finalGroups = new List<ImmutableList<ProcessedTripIntent>>();
        foreach (var g in groups)
        {
            var flow12 = g.ToImmutableList(); // Where trip is p1 -> p2
            var flow21 = new List<ProcessedTripIntent>(); // Where trip is p2 -> p1

            var p1 = g[0].P1; // Supposedly "From"
            var p2 = g[0].P2; // Supposedly "To"

            foreach (var trip1 in g)
            {
                // Check split in 2 sub-group according to flow between trips in the group
                // if (FlowsThisWay(trip1.TripSegments, p1, p2))
                // {
                flow12.Add(trip1);
                // }
                // else if (FlowsThisWay(trip1, p2, p1))
                // {
                //     flow21.Add(trip1 with { P1 = p2, P2 = p1 });
                // }
            }

            // Do not create group if only one trip intent
            if (flow12.Count > 1)
            {
                finalGroups.Add(flow12);
            }

            if (flow21.Count > 1)
            {
                // finalGroups.Add(flow21.ToList());
            }
        }

        // Remove duplicate groups by taking the group with the largest possible portion
        return GetBestGroups(finalGroups).ToImmutableList();
    }

    private static IEnumerable<ImmutableList<ProcessedTripIntent>> GetBestGroups(IEnumerable<ImmutableList<ProcessedTripIntent>> matchGroups)
    {
        var bestGroups = new Dictionary<string, KeyValuePair<double, ImmutableList<ProcessedTripIntent>>>();

        foreach (var matchGroup in matchGroups)
        {
            // Create group key
            var orderedMatchGroup = matchGroup.OrderBy(o => o.TripIntent.Id).ToList();
            var keyBuilder = new StringBuilder();
            orderedMatchGroup.ForEach(t => keyBuilder.Append(t.TripIntent.Id));
            var key = keyBuilder.ToString();

            // Calculate distance
            var p1 = matchGroup.First().P1.Location;
            var coordinates1 = new LatLng(p1.Lat, p1.Lng);

            var p2 = matchGroup.First().P2.Location;
            var coordinates2 = new LatLng(p2.Lat, p2.Lng);

            var dist = coordinates1.CalculateDistance(coordinates2);

            // Get current max
            if (bestGroups.TryGetValue(key, out var value))
            {
                if (dist > value.Key) // dist > max
                {
                    bestGroups[key] = new KeyValuePair<double, ImmutableList<ProcessedTripIntent>>(dist, matchGroup);
                }
            }
            else
            {
                bestGroups.Add(key, new KeyValuePair<double, ImmutableList<ProcessedTripIntent>>(dist, matchGroup));
            }
        }

        return bestGroups.Select(c => c.Value.Value);
    }

    private async Task<ImmutableSortedSet<WayPoint>> GetWayPoints(RallyingPoint from, RallyingPoint to)
    {
        var route = await routingService.BasicRouteMethod(new RoutingQuery(from.Location, to.Location));

        var wayPoints = new HashSet<WayPoint>();
        var rallyingPoints = new HashSet<RallyingPoint>();

        RallyingPoint? previousPoint = null;
        var order = 0;
        foreach (var wp in route.Coordinates)
        {
            var (closestPoint, distance) = await FindClosest(new LatLng(wp.Lat, wp.Lng));

            if (!(distance < InterpolationRadius) || rallyingPoints.Contains(closestPoint))
            {
                continue;
            }

            if (previousPoint is not null)
            {
                wayPoints.Add(new WayPoint(closestPoint, order));
                rallyingPoints.Add(closestPoint);
                order++;
            }

            previousPoint = closestPoint;
        }

        return wayPoints.ToImmutableSortedSet();
    }

    private async Task<(RallyingPoint point, double distance)> FindClosest(LatLng loc)
    {
        var rallyingPoints = await rallyingPointService.List(loc, null);

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

        return (closestPoint, minDistance);
    }
}