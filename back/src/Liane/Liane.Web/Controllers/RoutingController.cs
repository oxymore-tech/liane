using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api")]
    [ApiController]
    public class RoutingController : ControllerBase
    {
        private readonly IRoutingService routingService;

        public RoutingController(IRoutingService routingService)
        {
            this.routingService = routingService;
        }

        [HttpPost("route")]
        public async Task<ActionResult<Route>> BasicRouteMethod([FromBody] RoutingQuery query)
        {
            return await routingService.BasicRouteMethod(query);
        }
        
        [HttpPost("alternatives")]
        public async Task<ImmutableList<Route>> GetAlternatives([FromBody] RoutingQuery query)
        {
            return await routingService.GetAlternatives(query);
        }
        
        [HttpPost("waypoint")]
        public async Task<DeltaRoute> CrossAWayPoint([FromBody] RoutingWithPointQuery query)
        {
            return await routingService.CrossAWayPoint(query);
        }

        [HttpPost("detour")]
        public async Task<DeltaRoute> MakeADetour([FromBody] RoutingWithPointQuery query)
        {
            return await routingService.MakeADetour(query);
        }
        
    }
    
}