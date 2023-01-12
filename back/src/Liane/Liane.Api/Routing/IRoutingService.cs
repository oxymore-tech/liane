using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Routing;

public interface IRoutingService
{
    Task<Route> GetRoute(RoutingQuery routingQuery);
    Task<ImmutableList<Route>> GetAlternatives(RoutingQuery routingQuery);
    Task<DeltaRoute> CrossAWayPoint(RoutingWithPointQuery routingWithPointQuery);
    Task<DeltaRoute> MakeADetour(RoutingWithPointQuery routingWithPointQuery);
    Task<ImmutableSortedSet<WayPoint>> GetWayPoints(RallyingPoint from, RallyingPoint to);
    Task<ImmutableSortedSet<WayPoint>> GetTrip(Ref<RallyingPoint> from, Ref<RallyingPoint> to, ImmutableHashSet<Ref<RallyingPoint>> wayPoints);
}