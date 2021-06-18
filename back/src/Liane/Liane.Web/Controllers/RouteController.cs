using System.Threading.Tasks;
using Liane.Api.Location;
using Liane.Api.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/route")]
    [ApiController]
    public class RouteController : ControllerBase
    {
        private readonly IRoutingService routeService;

        public RouteController(IRoutingService routeService)
        {
            this.routeService = routeService;
        }

        [HttpPost("")]
        public async Task<ActionResult<Route>> Route([FromBody] UserLocation[] locations)
        {
            return await routeService.Route(locations);
        }

    }
}