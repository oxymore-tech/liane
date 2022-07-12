using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Routing;

namespace Liane.Service.Internal.Grouping;

public class TripIntentsGrouping
{
    private const int InterpolationRadius = 2_000; // Adaptable

    private readonly RoutingServiceImpl routingService;
    private readonly List<RallyingPoint>? rallyingPoints;

    public TripIntentsGrouping(List<RallyingPoint>? rallyingPoints)
    {
        this.rallyingPoints = rallyingPoints;
        var osrmService = new OsrmServiceImpl(new OsrmSettings(new Uri("http://router.project-osrm.org")));
        routingService = new RoutingServiceImpl(osrmService);
    }

    public async Task<IEnumerable<List<MatchedTripIntent>>> Group(List<TripIntent> intents)
    {
        // For every trip link the rallying points it passes by
        var trip2UsedPoints = await TripToSegments(intents);

        // Convert to object lists
        var tripsToPoints = trip2UsedPoints.Select(trip2Points => new TripToPoints(trip2Points.Key, trip2Points.Value));

        // Select all possible pair of points for each trip
        var tripsTo2Points = new List<MatchedTripIntent>();
        foreach (var tripToPoint in tripsToPoints)
        {
            var wayPoints = tripToPoint.UsedSegments.Keys;
            var tripWith2Points =
                from point1 in wayPoints
                from point2 in wayPoints
                where point1 != point2
                select new MatchedTripIntent(tripToPoint, point1, point2);

            tripsTo2Points.AddRange(tripWith2Points);
        }

        // Group the trips based on 2 points
        var groups =
            from tripTo2Points in tripsTo2Points
            group tripTo2Points by new { p1 = tripTo2Points.P1, p2 = tripTo2Points.P2 }
            into tripGroup
            where tripGroup.ToList().Count > 1 // Do not match the trip with itself
            select tripGroup.ToList();

        // Group based on the flow direction of the trips
        var finalGroups = new List<List<MatchedTripIntent>>();
        foreach (var g in groups)
        {
            var flow12 = new List<MatchedTripIntent>(); // Where trip is p1 -> p2
            var flow21 = new List<MatchedTripIntent>(); // Where trip is p2 -> p1

            var p1 = g[0].P1; // Supposedly "From"
            var p2 = g[0].P2; // Supposedly "To"

            foreach (var trip1 in g)
            {
                // Check split in 2 sub-group according to flow between trips in the group
                if (FlowsThisWay(trip1, p1, p2))
                {
                    flow12.Add(trip1);
                }
                else if (FlowsThisWay(trip1, p2, p1))
                {
                    flow21.Add(trip1 with { P1 = p2, P2 = p1 });
                }
            }

            // Do not create group if only one trip intent
            if (flow12.Count > 1)
            {
                finalGroups.Add(flow12.ToList());
            }

            if (flow21.Count > 1)
            {
                finalGroups.Add(flow21.ToList());
            }
        }

        // Remove duplicate groups by taking the group with the largest possible portion
        finalGroups = GetBestGroups(finalGroups).ToList();

        return finalGroups;
    }

    private static bool FlowsThisWay(MatchedTripIntent trip, RallyingPoint from, RallyingPoint to)
    {
        for (var tmp = trip.Trip.UsedSegments[from]; tmp != null!; tmp = trip.Trip.UsedSegments[tmp])
        {
            // Points passed via copy so can't compare references
            if (tmp.Id == to.Id)
            {
                return true;
            }
        }

        return false;
    }

    private static IEnumerable<List<MatchedTripIntent>> GetBestGroups(IEnumerable<List<MatchedTripIntent>> matchGroups)
    {
        var bestGroups = new Dictionary<string, KeyValuePair<double, List<MatchedTripIntent>>>();

        foreach (var matchGroup in matchGroups)
        {
            // Create group key
            var orderedMatchGroup = matchGroup.OrderBy(o => o.Trip.Trip.Id).ToList();
            var keyBuilder = new StringBuilder();
            orderedMatchGroup.ForEach(t => keyBuilder.Append(t.Trip.Trip.Id));
            var key = keyBuilder.ToString();

            // Calculate distance
            var dist = matchGroup.First().P1.Location.CalculateDistance(matchGroup.First().P2.Location);

            // Get current max
            if (bestGroups.TryGetValue(key, out var value))
            {
                if (dist > value.Key) // dist > max
                {
                    bestGroups[key] = new KeyValuePair<double, List<MatchedTripIntent>>(dist, matchGroup);
                }
            }
            else
            {
                bestGroups.Add(key, new KeyValuePair<double, List<MatchedTripIntent>>(dist, matchGroup));
            }
        }

        return bestGroups.Select(c => c.Value.Value);
    }

    private async Task<Dictionary<TripIntent, Dictionary<RallyingPoint, RallyingPoint>>> TripToSegments(List<TripIntent> intents)
    {
        var intent2RallyingPoints = new Dictionary<TripIntent, Dictionary<RallyingPoint, RallyingPoint>>();

        foreach (var ti in intents)
        {
            LatLng start = ti.From.Location;
            LatLng end = ti.To.Location;

            // Get the shortest path (list of coordinates) calculated with OSRM
            var route = await routingService.BasicRouteMethod(new RoutingQuery(start, end));

            // Interpolate to find the RallyingPoints it passes by (< 1 km)
            var waySegments = new Dictionary<RallyingPoint, RallyingPoint>();

            RallyingPoint? previousPoint = null;
            foreach (var wp in route.Coordinates)
            {
                var closestPoint = FindClosest(new LatLng(wp.Lat, wp.Lng), out var distance);

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

            // Insert in a dictionary the list of rallying points (in order) associated with the trip intent (used later on to create a LianeTrip ?)
            intent2RallyingPoints.Add(ti, waySegments);
        }

        return intent2RallyingPoints;
    }

    private RallyingPoint FindClosest(LatLng loc, out double distance)
    {
        int i = 0;
        var closestPoint = rallyingPoints?[i];
        double minDistance = closestPoint!.Location.CalculateDistance(loc);

        i++;
        while (i < rallyingPoints!.Count)
        {
            double currentDistance = rallyingPoints[i].Location.CalculateDistance(loc);
            if (currentDistance < minDistance)
            {
                minDistance = currentDistance;
                closestPoint = rallyingPoints[i];
            }

            i++;
        }

        distance = minDistance;
        return closestPoint;
    }

    private static void DisplayGroups(List<List<MatchedTripIntent>> intentGroups)
    {
        foreach (var group in intentGroups)
        {
            Console.Out.WriteAsync("Group (" + group[0].P1.Label + " -> " + group[0].P2.Label + ") : [ ");
            group.ForEach((t) => Console.Write(t.Trip.Trip.Id + " "));
            Console.Out.WriteLineAsync("]");
        }
    }

    [Obsolete("Not necessary")]
    private static HashSet<RallyingPoint> GetOnlyUsedPoints(Dictionary<TripIntent, Dictionary<RallyingPoint, RallyingPoint>> intent2RallyingPoints)
    {
        // Select all used rallying points
        var usedPoints = new HashSet<RallyingPoint>();
        foreach (var rp
                 in intent2RallyingPoints.SelectMany(
                     ti2Rp => ti2Rp.Value.Keys)
                )
        {
            usedPoints.Add(rp);
        }

        return usedPoints;
    }

    [Obsolete("Not necessary")]
    private async Task<Dictionary<TripIntent, List<RallyingPoint>>> TripToRallyingPoints(List<TripIntent> intents)
    {
        var intent2RallyingPoints = new Dictionary<TripIntent, List<RallyingPoint>>();

        foreach (var ti in intents)
        {
            LatLng start = ti.From.Location;
            LatLng end = ti.To.Location;

            // Get the shortest path (list of coordinates) calculated with OSRM
            var route = await routingService.BasicRouteMethod(new RoutingQuery(start, end));

            // Interpolate to find the RallyingPoints it passes by (< 1 km)
            var wayRallyingPoints = new List<RallyingPoint>();
            foreach (var wp in route.Coordinates)
            {
                var closestPoint = FindClosest(new LatLng(wp.Lat, wp.Lng), out var minDistance);
                if (minDistance < InterpolationRadius && !wayRallyingPoints.Contains(closestPoint))
                {
                    wayRallyingPoints.Add(closestPoint);
                }
            }

            // Insert in a dictionary the list of rallying points (in order) associated with the trip intent (used later on to create a LianeTrip ?)
            intent2RallyingPoints.Add(ti, wayRallyingPoints);
        }

        return intent2RallyingPoints;
    }

    [Obsolete("Not necessary")]
    private static List<List<TripIntent>> GroupTripIntents(Dictionary<RallyingPoint, List<TripIntent>> usedPoint2TripIntents,
        IReadOnlyDictionary<TripIntent, List<RallyingPoint>> trip2RallyingPoints)
    {
        // 1ST METHOD - WITHOUT LINQ 
        var groups = new List<List<TripIntent>>();
        foreach (var rp1ToTrips in usedPoint2TripIntents) // For each Point -> [Trips]
        {
            foreach (var linkedTi in rp1ToTrips.Value) // Every trips passing by rp1
            {
                if (trip2RallyingPoints.TryGetValue(linkedTi, out var wayPoints)) // Every other rp2 where the trip passes by
                    foreach (var usedByCurrent in wayPoints) // For each point used by the current trip
                    {
                        if (usedByCurrent != rp1ToTrips.Key) // If not the 1st common rallying point
                        {
                            if (usedPoint2TripIntents.TryGetValue(usedByCurrent, out var otherLinkedTis)) // Every trip which passes by rp2
                                foreach (var linkedTi2 in otherLinkedTis)
                                {
                                    if (rp1ToTrips.Value.Contains(linkedTi2)) // If ti2 passes by rp1 too then group
                                    {
                                        groups.Add(new List<TripIntent>() { linkedTi, linkedTi2 });
                                    }
                                }
                        }
                    }
            }
        }

        return groups;
    }
}