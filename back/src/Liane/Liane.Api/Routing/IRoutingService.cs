using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.RallyingPoints;

namespace Liane.Api.Routing;

public interface IRoutingService
{
    Task<Route> GetRoute(RoutingQuery routingQuery);
    Task<ImmutableList<Route>> GetAlternatives(RoutingQuery routingQuery);
    Task<DeltaRoute> CrossAWayPoint(RoutingWithPointQuery routingWithPointQuery);
    Task<DeltaRoute> MakeADetour(RoutingWithPointQuery routingWithPointQuery);
    Task<ImmutableSortedSet<WayPoint>> GetWayPoints(RallyingPoint from, RallyingPoint to);
}