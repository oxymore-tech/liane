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
    }
}