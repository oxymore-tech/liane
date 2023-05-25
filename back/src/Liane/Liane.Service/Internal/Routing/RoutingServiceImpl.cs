using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Osrm;
using Microsoft.Extensions.Logging;
using Route = Liane.Api.Routing.Route;

namespace Liane.Service.Internal.Routing;

using LngLatTuple = Tuple<double, double>;

public sealed class RoutingServiceImpl : IRoutingService
{
  private readonly IOsrmService osrmService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly ILogger<RoutingServiceImpl> logger;

  public RoutingServiceImpl(IOsrmService osrmService, IRallyingPointService rallyingPointService, ILogger<RoutingServiceImpl> logger)
  {
    this.osrmService = osrmService;
    this.rallyingPointService = rallyingPointService;
    this.logger = logger;
  }

  public async Task<Route> GetRoute(RoutingQuery query)
  {
    return await GetRoute(query.Coordinates);
  }

  public async Task<Route> GetRoute(IEnumerable<LatLng> coordinates)
  {
    var routeResponse = await osrmService.Route(coordinates, overview: "full");

    var geojson = routeResponse.Routes[0].Geometry;
    var duration = routeResponse.Routes[0].Duration;
    var distance = routeResponse.Routes[0].Distance;
    return new Route(geojson.Coordinates, duration, distance);
  }

  public async Task<ImmutableList<LatLng>> GetSimplifiedRoute(IEnumerable<LatLng> coordinates)
  {
    var route = await GetRoute(coordinates);
    var geometry = Simplifier.Simplify(route);
    logger.LogDebug("Liane geometry simplified {input} => {output}", route.Coordinates.Count, geometry.Count);
    return geometry;
  }

  public async Task<RouteWithSteps> GetRouteStepsGeometry(RoutingQuery query)
  {
    var multiLineStringGeometry = new List<ImmutableList<Tuple<double, double>>>();
    for (var i = 0; i < query.Coordinates.Count - 1; i++)
    {
      var step = ImmutableList.Create(query.Coordinates[i], query.Coordinates[i + 1]);
      var routeStepResponse = await osrmService.Route(step, overview: "full");
      multiLineStringGeometry.Add(routeStepResponse.Routes[0].Geometry.Coordinates);
    }

    return new RouteWithSteps(multiLineStringGeometry.ToImmutableList());
  }

  public async Task<ImmutableList<Route>> GetAlternatives(RoutingQuery query)
  {
    var routeResponse = await osrmService.Route(query.Coordinates, "true", overview: "full");
    return routeResponse.Routes.Select(r => new Route(r.Geometry.Coordinates, r.Duration, r.Distance))
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

    var input = ImmutableList.Create(query.Start, wayPoint, query.End);
    var routeResponse = await osrmService.Route(input, overview: "full");

    var coordinates = routeResponse.Routes[0].Geometry.Coordinates;
    var newDuration = routeResponse.Routes[0].Duration;
    var newDistance = routeResponse.Routes[0].Distance;
    var delta = duration - newDuration;
    Console.Write($" duration = {duration}, newDuration = {newDuration}, delta = {delta} ");
    return new DeltaRoute(coordinates, newDuration, newDistance, Math.Abs(delta));
  }

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
      return new DeltaRoute(ImmutableList<Tuple<double, double>>.Empty, duration, distance, -1);
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
          return new DeltaRoute(ImmutableList<LngLatTuple>.Empty, duration, distance, -2);
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
        return new DeltaRoute(geojson.Coordinates, duration, distance, -3);
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
    return new DeltaRoute(ImmutableList.Create(startIntersections[0].Location, endIntersections[0].Location), duration, distance, -4);
  }

  /// <summary>
  /// Get the matrix of durations between each pair of rallying points as a dictionary
  /// </summary>
  /// <returns>The matrix composed of tuples (duration, distance)</returns>
  private async ValueTask<Dictionary<RallyingPoint, Dictionary<RallyingPoint, (double? duration, double? distance)>>> GetDurationMatrix(ImmutableArray<RallyingPoint> keys)
  {
    var (durations, distances) = await osrmService.Table(keys.Select(rp => rp.Location));
    var matrix = new Dictionary<RallyingPoint, Dictionary<RallyingPoint, (double?, double?)>>();

    for (var i = 0; i < durations.Length; i++)
    {
      matrix[keys[i]] = new Dictionary<RallyingPoint, (double?, double?)>();
      for (var j = 0; j < durations[i].Length; j++)
      {
        matrix[keys[i]][keys[j]] = (durations[i][j], distances[i][j]);
      }
    }

    return matrix;
  }

  public async Task<ImmutableList<WayPoint>?> GetTrip(DateTime departureTime, RouteSegment extremities, IEnumerable<RouteSegment> segments)
  {
    var start = await rallyingPointService.Get(extremities.From);
    var end = await rallyingPointService.Get(extremities.To);
    // A dictionary holding each point's constraints
    // The HashSet contains all points that must be visited before this point can be added to the trip.
    // If the hashset of a given point P contains P, it indicates this point is no longer visitable.
    var pointsDictionary = new Dictionary<RallyingPoint, HashSet<RallyingPoint>>();
    var trip = new List<WayPoint>();

    foreach (var member in segments)
    {
      var resolvedFrom = await member.From.Resolve(rallyingPointService.Get);
      var resolvedTo = await member.To.Resolve(rallyingPointService.Get);
      pointsDictionary.TryAdd(resolvedFrom, new HashSet<RallyingPoint>());
      pointsDictionary.TryAdd(resolvedTo, new HashSet<RallyingPoint>());
      // Add precedence constraints
      if (resolvedFrom != start)
      {
        pointsDictionary[resolvedTo].Add(resolvedFrom);
      }
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
    if (pointsDictionary.Keys.Count < 2)
    {
      return null;
    }

    var matrix = await GetDurationMatrix(pointsDictionary.Keys.ToImmutableArray());

    var eta = departureTime;

    // Start trip and add starting point directly
    trip.Add(new WayPoint(start, 0, 0, eta));
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
      if (nextPointData.Value.duration is null || nextPointData.Value.distance is null)
      {
        return null;
      }

      var duration = (int)nextPointData.Value.duration;
      eta = eta.AddSeconds(duration);

      trip.Add(new WayPoint(selected, duration, (int)nextPointData.Value.distance, eta));

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

    return trip.ToImmutableList();
  }
}