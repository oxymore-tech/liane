using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Trip;

namespace Liane.Api.Routing;

public interface IRoutingService
{
  Task<Route> GetRoute(RoutingQuery routingQuery, CancellationToken cancellationToken = default);
  Task<Route> GetRoute(IEnumerable<LatLng> coordinates, CancellationToken cancellationToken = default);
  Task<Route> GetRoute(LatLng from, LatLng to, CancellationToken cancellationToken = default);

  Task<RouteWithSteps> GetRouteStepsGeometry(RoutingQuery query);
  Task<ImmutableList<Route>> GetAlternatives(RoutingQuery routingQuery);
  Task<DeltaRoute> CrossAWayPoint(RoutingWithPointQuery routingWithPointQuery);

  Task<ImmutableList<WayPoint>> GetOptimizedTrip(ImmutableList<RallyingPoint> points, ImmutableHashSet<RallyingPoint> startpoints, ImmutableHashSet<RallyingPoint> endpoints);

  Task<ImmutableList<WayPoint>?> GetTrip(DepartureOrArrivalTime departureOrArrival, RouteSegment endpoints, IEnumerable<RouteSegment> segments)
    => departureOrArrival.Direction switch
    {
      Direction.Departure => GetTrip(departureOrArrival.At, endpoints, segments),
      Direction.Arrival => GetTripArriveBefore(departureOrArrival.At, endpoints, segments),
      _ => throw new ArgumentOutOfRangeException()
    };

  async Task<ImmutableList<WayPoint>?> GetTripArriveBefore(DateTime arriveBefore, RouteSegment endpoints, IEnumerable<RouteSegment> segments)
  {
    var trip = await GetTrip(arriveBefore, endpoints, segments);
    if (trip is null)
    {
      return null;
    }

    var diff = trip.Last().Eta - arriveBefore;
    return trip.Select(wp => wp with { Eta = wp.Eta - diff })
      .ToImmutableList();
  }

  /// <summary>
  /// Solves the Travelling Salesman Problem while respecting precedence constraints provided by each pair of rallying points
  /// using a simple Nearest Neighbour heuristic.
  /// </summary>
  /// <param name="departureTime"></param>
  /// <param name="endpoints">The (start, end) points of the trip</param>
  /// <param name="segments">The (from, to) segments</param>
  /// <returns>A sorted set of WayPoints or null if no solution exist that satisfies given constraints</returns>
  Task<ImmutableList<WayPoint>?> GetTrip(DateTime departureTime, RouteSegment endpoints, IEnumerable<RouteSegment> segments);
}