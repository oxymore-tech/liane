using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Routing;

public interface IRoutingService
{
    Task<Route> GetRoute(RoutingQuery routingQuery);
    Task<Route> GetRoute(ImmutableList<LatLng> coordinates);
    Task<RouteWithSteps> GetRouteStepsGeometry(RoutingQuery query);
    Task<ImmutableList<Route>> GetAlternatives(RoutingQuery routingQuery);
    Task<DeltaRoute> CrossAWayPoint(RoutingWithPointQuery routingWithPointQuery);
    Task<DeltaRoute> MakeADetour(RoutingWithPointQuery routingWithPointQuery);
    Task<ImmutableSortedSet<WayPoint>> GetWayPoints(RallyingPoint from, RallyingPoint to);
    Task<ImmutableSortedSet<WayPoint>> GetTrip(Ref<RallyingPoint> from, Ref<RallyingPoint> to, ImmutableHashSet<Ref<RallyingPoint>> wayPoints);

    /// <summary>
    /// Solves the Travelling Salesman Problem while respecting precedence constraints provided by each pair of rallying points
    /// using a simple Nearest Neighbour heuristic.
    /// </summary>
    /// <param name="extremities">The (start, end) points of the trip</param>
    /// <param name="segments">The (from, to) segments</param>
    /// <returns>A sorted set of WayPoints or null if no solution exist that satisfies given constraints</returns>
    Task<ImmutableSortedSet<WayPoint>?> GetTrip(RouteSegment extremities, IEnumerable<RouteSegment> segments);

}
