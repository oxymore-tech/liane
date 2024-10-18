using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Osrm;
using Microsoft.Extensions.Logging;
using Route = Liane.Api.Routing.Route;

namespace Liane.Service.Internal.Routing;

public sealed class RoutingServiceImpl(IOsrmService osrmService, ILogger<RoutingServiceImpl> logger) : IRoutingService
{
  public Task<Route> GetRoute(RoutingQuery query, CancellationToken cancellationToken = default) => GetRoute(query.Coordinates, cancellationToken);

  public Task<Route> GetRoute(LatLng from, LatLng to, CancellationToken cancellationToken = default) => GetRoute(GetFromTo(from, to), cancellationToken);

  public async Task<Route> GetRoute(IEnumerable<LatLng> coordinates, CancellationToken cancellationToken = default)
  {
    var routeResponse = await osrmService.Route(coordinates, overview: "full", cancellationToken: cancellationToken);

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

  /// <summary>
  /// Get the matrix of durations between each pair of rallying points as a dictionary
  /// </summary>
  /// <returns>The matrix composed of tuples (duration, distance)</returns>
  private async ValueTask<Dictionary<RallyingPoint, Dictionary<RallyingPoint, (double? duration, double? distance)>>> GetDurationMatrix(ImmutableList<RallyingPoint> keys)
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

  public async Task<ImmutableList<WayPoint>?> GetTrip(DateTime departureTime, RouteSegment endpoints, IEnumerable<RouteSegment> segments)
  {
    var start = endpoints.From;
    var end = endpoints.To;
    // A dictionary holding each point's constraints
    // The HashSet contains all points that must be visited before this point can be added to the trip.
    // If the hashset of a given point P contains P, it indicates this point is no longer visitable.
    var pointsDictionary = new Dictionary<RallyingPoint, HashSet<RallyingPoint>>();
    var trip = new List<WayPoint>();

    foreach (var member in segments)
    {
      pointsDictionary.TryAdd(member.From, new HashSet<RallyingPoint>());
      pointsDictionary.TryAdd(member.To, new HashSet<RallyingPoint>());
      // Add precedence constraints
      if (member.From != start)
      {
        pointsDictionary[member.To].Add(member.From);
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
    pointsDictionary[end] = pointsDictionary.Keys.Except([start, end]).ToHashSet();

    // Get distance matrix for points
    if (pointsDictionary.Keys.Count < 2)
    {
      return null;
    }

    var matrix = await GetDurationMatrix([..pointsDictionary.Keys]);

    var eta = departureTime;

    // Start trip and add starting point directly
    trip.Add(new WayPoint(start, 0, 0, eta));
    // Add a constraint to indicate this point has already been visited
    pointsDictionary[start].Add(start);

    // Get visitable points
    var visitable = pointsDictionary.Where(kv => kv.Value.Count == 0).Select(kv => kv.Key).ToHashSet();
    var currentPoint = start;

    while (visitable.Count != 0)
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

    return trip.Count != pointsDictionary.Count
      ? null // No solution found
      : trip.ToImmutableList();
  }

  public async Task<ImmutableList<WayPoint>> GetOptimizedTrip(ImmutableList<RallyingPoint> points)
  {
    // call osrm trip service
    var tripResponse = await osrmService.Trip(points.Select(rp => rp.Location));
    var eta = DateTime.UtcNow.Date;
    return tripResponse.Waypoints
      .Select(w =>
      {
        var rallyingPoint = points[w.WaypointIndex];
        return (w, rallyingPoint);
      })
      .Select((t, i) =>
      {
        var leg = i == 0 ? null : tripResponse.Trips[0].Legs[i - 1];
        var duration = (int)(leg?.Duration ?? 0);
        var distance = (int)(leg?.Distance ?? 0);
        return new WayPoint(t.rallyingPoint,
          duration,
          distance,
          eta.AddSeconds(duration)
        );
      }).ToImmutableList();
  }

  private static IEnumerable<LatLng> GetFromTo(LatLng fromLocation, LatLng toLocation)
  {
    yield return fromLocation;
    yield return toLocation;
  }
}