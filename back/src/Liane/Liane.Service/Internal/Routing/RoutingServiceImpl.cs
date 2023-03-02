using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Osrm;
using Route = Liane.Api.Routing.Route;

namespace Liane.Service.Internal.Routing;
public sealed class RoutingServiceImpl : IRoutingService
{
    private readonly IOsrmService osrmService;
    private readonly IRallyingPointService rallyingPointService;

    public RoutingServiceImpl(IOsrmService osrmService, IRallyingPointService rallyingPointService)
    {
        this.osrmService = osrmService;
        this.rallyingPointService = rallyingPointService;
    }

    public async Task<Route> GetRoute(RoutingQuery query)
    {
        var coordinates = ImmutableList.Create(query.Start, query.End);
        return await GetRoute(coordinates);
    }
    
    public async Task<Route> GetRoute(ImmutableList<LatLng> coordinates)
    {
      var routeResponse = await osrmService.Route(coordinates, overview: "full");

      var geojson = routeResponse.Routes[0].Geometry;
      var duration = routeResponse.Routes[0].Duration;
      var distance = routeResponse.Routes[0].Distance;
      return new Route(geojson.Coordinates.ToLatLng(), duration, distance);
    }

    public async Task<ImmutableList<Route>> GetAlternatives(RoutingQuery query)
    {
        var coordinates = ImmutableList.Create(query.Start, query.End);
        var routeResponse = await osrmService.Route(coordinates, "true", overview: "full");
        return routeResponse.Routes.Select(r => new Route(r.Geometry.Coordinates.ToLatLng(), r.Duration, r.Distance))
            .ToImmutableList();
    }

    public async Task<DeltaRoute> CrossAWayPoint(RoutingWithPointQuery query)
    {
        var wayPoint = query.Point;
        float duration;
        if (query.Duration <= 0)
        {
            // Calculate the fastest route without necessarily passing by the waypoint
            var fastestRouteResponse =
                await osrmService.Route(ImmutableList.Create(query.Start, query.End), overview: "full");
            duration = fastestRouteResponse.Routes[0].Duration;
        }
        else
        {
            duration = query.Duration;
        }

        var coordinates = ImmutableList.Create(query.Start, wayPoint, query.End);
        var routeResponse = await osrmService.Route(coordinates, overview: "full");

        coordinates = routeResponse.Routes[0].Geometry.Coordinates.ToLatLng();
        var newDuration = routeResponse.Routes[0].Duration;
        var newDistance = routeResponse.Routes[0].Distance;
        var delta = duration - newDuration;
        Console.Write($" duration = {duration}, newDuration = {newDuration}, delta = {delta} ");
        return new DeltaRoute(coordinates, newDuration, newDistance, Math.Abs(delta));
    }

    // ROUTE excluding POINT
    // param: startPoint, endPoint, wayPoint(, duration, distance) ; return: geojson LineString, newDuration, newDistance, delta
    public async Task<DeltaRoute> MakeADetour(RoutingWithPointQuery query)
    {
        var detourPoint = query.Point;
        var duration = query.Duration;
        var distance = query.Distance;
        Geojson geojson = new("LineString", query.Coordinates.ToLngLatTuple());
        if (duration <= 0 || distance <= 0)
        {
            // Calculate the fastest route to compare
            var fastestRouteResponse =
                await osrmService.Route(ImmutableList.Create(query.Start, query.End), overview: "full");
            geojson = fastestRouteResponse.Routes[0].Geometry;
            duration = fastestRouteResponse.Routes[0].Duration;
            distance = fastestRouteResponse.Routes[0].Distance;
        }

        var coordinates = ImmutableList.Create(query.Start, detourPoint, query.End);
        var routeResponse = await osrmService.Route(coordinates, steps: "true", overview: "full");
        Console.Write($"nb Leg: {routeResponse.Routes[0].Legs.Count}");
        var newDuration = routeResponse.Routes[0].Duration;
        var newDistance = routeResponse.Routes[0].Distance;
        // Assumption made : if with the same startPoint and same endPoint, two routes return the same value for duration and distance, then the routes are equals.

        // If the two routes don't share the same distance and duration, there are not equal : then the fastest route doesn't cross the excluded point
        if (Math.Abs(duration - newDuration) > 0 && Math.Abs(distance - newDistance) > 0)
        {
            // Then the fastest route not passing by the detourPoint is simply the fastestRoute and delta = 0
            return new DeltaRoute(ImmutableList<LatLng>.Empty, duration, distance, -1);
        }

        // Else find the steps where the route cross the detourPoint
        var l = routeResponse.Routes[0].Legs[0].Steps.Count; // at least > 2
        var startIntersections = routeResponse.Routes[0].Legs[0].Steps[l - 2].Intersections;
        var endIntersections = routeResponse.Routes[0].Legs[1].Steps[1].Intersections;

        // Normally routeResponse.Routes[0].Legs[0].Steps[ l-1].Location == routeResponse.Routes[0].Legs[1].Steps[0].Location == detourPoint
        Console.Write(startIntersections[0] + ", " + endIntersections[0] + "\n");

        // Then find alternatives routes between startIntersection[0].Location endIntersection[1].Location
        // Here need to check the entry values before sending an alternative request
        // If the entry values not corresponding then go find an other step ( start: Steps[i-1], end: Steps[i+1] )


        // looking for an exits to not cross the detourPoint
        var search = true;
        var stepsId = routeResponse.Routes[0].Legs[0].Steps.Count - 2;

        do
        {
            var nbOfExits = 0;
            foreach (var anEntry in startIntersections[0].Entry)
            {
                if (anEntry)
                {
                    nbOfExits += 1;
                }
            }

            if (nbOfExits > 1)
            {
                search = false;
            }
            else
            {
                stepsId -= 1;
                if (stepsId < 0)
                {
                    // No solution
                    return new DeltaRoute(ImmutableList<LatLng>.Empty, duration, distance, -2);
                }

                startIntersections = routeResponse.Routes[0].Legs[0].Steps[stepsId].Intersections;
            }
        } while (search);

        // Looking for an entry after the detourPoint
        stepsId = 0;
        var maxStepsId = routeResponse.Routes[0].Legs[1].Steps.Count;
        search = true;
        do
        {
            var nbOfEntries = 0;
            foreach (var anEntry in endIntersections[0].Entry)
            {
                if (anEntry)
                {
                    nbOfEntries += 1;
                }
            }

            if (nbOfEntries > 1)
            {
                search = false;
            }

            //else
            //{
            stepsId += 1;
            if (stepsId > maxStepsId)
            {
                // No solution
                return new DeltaRoute(geojson.Coordinates.ToLatLng(), duration, distance, -3);
            }

            endIntersections = routeResponse.Routes[0].Legs[1].Steps[stepsId].Intersections;
            //}
        } while (search);

        // Then generate the final route which is not crossing detourPoint
        var alternatives = await GetAlternatives(new RoutingQuery(startIntersections[0].Location, endIntersections[0].Location));

        if (alternatives.Count > 1)
        {
            Console.Write($" nb alts:{alternatives.Count}, coord start:{alternatives[0].Coordinates}\n");
            var alternativePath = alternatives[1];
            // TODO: Get the coordinates before and after the deviation
            // final coordinates = ( path between start and startInstersections, alternative path, path between endIntersections and end)
            return new DeltaRoute(alternativePath.Coordinates, newDuration, newDistance, Math.Abs(alternatives[0].Duration - alternativePath.Duration));
        }

        // No solution
        return new DeltaRoute(ImmutableList.Create<LatLng>(startIntersections[0].Location, endIntersections[0].Location), duration, distance, -4);
    }
    
   
    public async Task<ImmutableSortedSet<WayPoint>> GetWayPoints(RallyingPoint from, RallyingPoint to)
    {
        var route = await GetRoute(new RoutingQuery(from.Location, to.Location));
        var wayPoints = new HashSet<WayPoint>();
        var rallyingPoints = new HashSet<RallyingPoint>();

        var order = 0;
        foreach (var wp in route.Coordinates)
        {
            var closestPoint = await rallyingPointService.Snap(new LatLng(wp.Lat, wp.Lng));

            if (closestPoint == null || rallyingPoints.Contains(closestPoint))
            {
                continue;
            }

            wayPoints.Add(new WayPoint(closestPoint, order, 0, 0));
            rallyingPoints.Add(closestPoint);
            order++;
        }

        return wayPoints.ToImmutableSortedSet();
    }

    
    public async Task<ImmutableSortedSet<WayPoint>> GetTrip(Ref<RallyingPoint> from, Ref<RallyingPoint> to, ImmutableHashSet<Ref<RallyingPoint>> wayPoints)
    {
        // Get a list of coordinates from RallyingPoint references
        var coordinates = new List<RallyingPoint> { await rallyingPointService.Get(from) };

        foreach (var wayPoint in wayPoints)
        {
            coordinates.Add(await rallyingPointService.Get(wayPoint));
        }
        coordinates.Add(await rallyingPointService.Get(to));
        
        // Get trip from coordinates 
        var rawTrip = await osrmService.Trip(coordinates.Select(rp => rp.Location));
        
        // Get sorted WayPoints (map osrm waypoints to our rallying points)
        var waypoints = coordinates.Select((rallyingPoint, i) =>
        {
            var waypoint = rawTrip.Waypoints[i];
            if (waypoint.TripsIndex != 0) throw new ArgumentException(); //TODO(improve) we should only have 1 trip in Trips array
            int duration = 0;
            int distance = 0;
            if (i > 0)
            {
                var routeLeg = rawTrip.Trips[0].Legs[i-1];
                duration = (int)Math.Ceiling(routeLeg.Duration);
                distance = (int)Math.Ceiling(routeLeg.Distance);
            }

            return new WayPoint(rallyingPoint, waypoint.WaypointIndex, duration, distance);

        }).ToImmutableSortedSet();

        return waypoints;
    }


    /// <summary>
    /// Get the matrix of durations between each pair of rallying points as a dictionary
    /// </summary>
    /// <returns>The matrix composed of tuples (duration, distance)</returns>
    private async ValueTask<Dictionary<RallyingPoint, Dictionary<RallyingPoint, (double duration, double distance)>>> GetDurationMatrix(ImmutableArray<RallyingPoint> keys)
    {
      var table = (await osrmService.Table(keys.Select(rp => rp.Location)));
      var durationTable = table.Durations;
      var matrix = new Dictionary<RallyingPoint, Dictionary<RallyingPoint, (double, double)>>();

      for (var i = 0; i < durationTable.Length; i++)
      {
        matrix[keys[i]] = new Dictionary<RallyingPoint, (double,double)>();
        for (var j = 0; j < durationTable[i].Length; j++)
        {
          matrix[keys[i]][keys[j]] = (durationTable[i][j], table.Distances[i][j]);
        }
      }

      return matrix;
    }
    
    

    public async Task<ImmutableSortedSet<WayPoint>?> GetTrip(RouteSegment  extremities, IEnumerable<RouteSegment> segments)
    {
      var start = await extremities.From.Resolve(rallyingPointService.Get);
      var end = await extremities.To.Resolve(rallyingPointService.Get);
      // A dictionary holding each point's constraints
      // The HashSet contains all points that must be visited before this point can be added to the trip.
      // If the hashset of a given point P contains P, it indicates this point is no longer visitable.
      var pointsDictionary = new Dictionary<RallyingPoint, HashSet<RallyingPoint>>();
      var trip = new List<WayPoint>();

      foreach (var member in segments)
      {
        // TODO optimize ref resolving 
        var resolvedFrom = await member.From.Resolve(rallyingPointService.Get);
        var resolvedTo = await member.To.Resolve(rallyingPointService.Get);
        pointsDictionary.TryAdd(resolvedFrom, new HashSet<RallyingPoint>());
        pointsDictionary.TryAdd(resolvedTo, new HashSet<RallyingPoint>());
        // Add precedence constraints
        if (resolvedFrom != start) pointsDictionary[resolvedTo].Add(resolvedFrom);
      
      } 
      // Add start and end point
      pointsDictionary.TryAdd(start, new HashSet<RallyingPoint>());
      if (pointsDictionary[start].Count > 0)
      {
        // If start has constraints, then there is no solution
        return null;
      }
      // End is marked with precedence constraints from all other points except itself and start
      pointsDictionary[end] = pointsDictionary.Keys.Except(new[] { start, end }).ToHashSet();

      // Get distance matrix for points 
      var matrix = await GetDurationMatrix(pointsDictionary.Keys.ToImmutableArray());
     
      // Start trip and add starting point directly 
      trip.Add(new WayPoint(start, 0, 0, 0));
      // Add a constraint to indicate this point has already been visited 
      pointsDictionary[start].Add(start);

      // Get visitable points
      var visitable = pointsDictionary.Where(kv => kv.Value.Count == 0).Select(kv => kv.Key).ToHashSet();
      var currentPoint = start;

      while (visitable.Any())
      {
        // Get next point amongst visitable 
        var nextPointData = matrix[currentPoint].IntersectBy(visitable, kv => kv.Key).MinBy(kv => kv.Value);
        var selected = nextPointData.Key;
        
        // Append to trip
        trip.Add(new WayPoint(selected, trip.Count, (int)nextPointData.Value.duration, (int)nextPointData.Value.distance));
     
        // Update constraints and visitable points 
        foreach (var kv in pointsDictionary)
        {
          kv.Value.Remove(selected);
        }  
        pointsDictionary[selected].Add(selected);

        currentPoint = selected;
        visitable = pointsDictionary.Where(kv => kv.Value.Count == 0)
          .Select(kv => kv.Key).ToHashSet();
        
      }

      if (trip.Count != pointsDictionary.Count)
      {
        // No solution found
        return null;
      }

      return trip.ToImmutableSortedSet();

    }
    
}