using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Util;
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

  public async Task<ImmutableList<WayPoint>> GetOptimizedTrip(ImmutableList<RallyingPoint> points, ImmutableHashSet<RallyingPoint> startpoints, ImmutableHashSet<RallyingPoint> endpoints)
  {
    var table = await osrmService.Table(points.Select(p => p.Location));

    var n = points.Count;

    if (n == 0)
    {
      return ImmutableList<WayPoint>.Empty;
    }

    var permutations = GetPermutations(n);
    var bestDistance = double.MaxValue;
    List<int>? bestRoute = null;

    var matrix = new double[n, n];
    for (var i = 0; i < n; i++)
    {
      for (var j = 0; j < n; j++)
      {
        matrix[i, j] = table.Durations[i][j] ?? double.MaxValue;
      }
    }

    foreach (var perm in permutations)
    {
      if (!startpoints.Contains(points[perm.First()]))
      {
        continue;
      }

      if (!endpoints.Contains(points[perm.Last()]))
      {
        continue;
      }

      var distance = GetRouteDistance(perm, matrix);
      if (distance < bestDistance)
      {
        bestDistance = distance;
        bestRoute = perm;
      }
    }

    if (bestRoute is null)
    {
      return ImmutableList<WayPoint>.Empty;
    }

    var wayPoints = new List<WayPoint>();
    var eta = TimeUtils.NowInFrance().Date;
    int? previous = null;
    foreach (var i in bestRoute)
    {
      var duration = 0;
      var distance = 0;
      if (previous is not null)
      {
        duration = (int)matrix[previous.Value, i];
        distance = (int)(table.Distances[previous.Value][i] ?? 0);
        eta = eta.AddSeconds(duration);
      }

      wayPoints.Add(new WayPoint(points[i], duration, distance, eta));
      previous = i;
    }

    return wayPoints.ToImmutableList();
  }

  private static List<List<int>> GetPermutations(int n)
  {
    var result = new List<List<int>>();
    var list = Enumerable.Range(0, n).ToList();
    GeneratePermutations(list, 0, n - 1, result);
    return result;
  }

  private static void GeneratePermutations(List<int> list, int left, int right, List<List<int>> result)
  {
    if (left == right)
    {
      result.Add([..list]);
    }
    else
    {
      for (var i = left; i <= right; i++)
      {
        {
          var a = list[left];
          var b = list[i];
          list[left] = b;
          list[i] = a;
        }
        GeneratePermutations(list, left + 1, right, result);
        {
          // Backtrack
          var a = list[left];
          var b = list[i];
          list[left] = b;
          list[i] = a;
        }
      }
    }
  }

  private static double GetRouteDistance(List<int> route, double[,] distanceMatrix)
  {
    double totalDistance = 0;
    for (var i = 0; i < route.Count - 1; i++)
    {
      totalDistance += distanceMatrix[route[i], route[i + 1]];
    }

    return totalDistance;
  }

  private static IEnumerable<LatLng> GetFromTo(LatLng fromLocation, LatLng toLocation)
  {
    yield return fromLocation;
    yield return toLocation;
  }
}