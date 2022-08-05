using System.Threading.Tasks;
using Liane.Api.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/basicRoute")]
[ApiController]
public class RouteController : ControllerBase
{
    private readonly IRoutingService routeService;

    public RouteController(IRoutingService routeService)
    {
        this.routeService = routeService;
    }

    [HttpPost("")]
    public async Task<ActionResult<Route>> BasicRouteMethod([FromBody] RoutingQuery routingQuery)
    {
        return await routeService.BasicRouteMethod(routingQuery);
    }

}