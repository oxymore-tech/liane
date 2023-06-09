using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;

namespace Liane.Api.Routing;

public interface IRoutingService
{
  Task<Route> GetRoute(RoutingQuery routingQuery, CancellationToken cancellationToken = default);
  Task<Route> GetRoute(IEnumerable<LatLng> coordinates, CancellationToken cancellationToken = default);

  Task<ImmutableList<LatLng>> GetSimplifiedRoute(IEnumerable<LatLng> coordinates);

  Task<RouteWithSteps> GetRouteStepsGeometry(RoutingQuery query);
  Task<ImmutableList<Route>> GetAlternatives(RoutingQuery routingQuery);
  Task<DeltaRoute> CrossAWayPoint(RoutingWithPointQuery routingWithPointQuery);
  Task<DeltaRoute> MakeADetour(RoutingWithPointQuery routingWithPointQuery);

  /// <summary>
  /// Solves the Travelling Salesman Problem while respecting precedence constraints provided by each pair of rallying points
  /// using a simple Nearest Neighbour heuristic.
  /// </summary>
  /// <param name="departureTime"></param>
  /// <param name="extremities">The (start, end) points of the trip</param>
  /// <param name="segments">The (from, to) segments</param>
  /// <returns>A sorted set of WayPoints or null if no solution exist that satisfies given constraints</returns>
  Task<ImmutableList<WayPoint>?> GetTrip(DateTime departureTime, RouteSegment extremities, IEnumerable<RouteSegment> segments);
}