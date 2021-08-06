using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Location;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Api.Routing
{
    public interface IRoutingService
    {
        Task<ActionResult<Route>> Route(UserLocation[] locations);
        Task<Route> BasicRouteMethod(RoutingQuery routingQuery);
        Task<ImmutableList<Route>> GetAlternatives(RoutingQuery routingQuery);
        Task<DeltaRoute> CrossAWayPoint(RoutingWithPointQuery routingWithPointQuery);
        Task<DeltaRoute> MakeADetour(RoutingWithPointQuery routingWithPointQuery);
    }
}