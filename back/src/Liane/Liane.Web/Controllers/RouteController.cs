using System.Threading.Tasks;
using Liane.Api.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/route")]
[ApiController]
public class RouteController(IRoutingService routeService) : ControllerBase
{
  [HttpPost("")]
  public async Task<ActionResult<RouteWithSteps>> BasicRouteMethod([FromBody] RoutingQuery routingQuery)
  {
    return await routeService.GetRouteStepsGeometry(routingQuery);
  }

  [HttpGet("duration")]
  public async Task<float> GetTravelTime([FromQuery] double latFrom, [FromQuery] double lngFrom, [FromQuery] double latTo, [FromQuery] double lngTo)
  {
    var route = await routeService.GetRoute(new RoutingQuery(new LatLng(latFrom, lngFrom), new LatLng(latTo, lngTo)));
    return route.Duration;
  }
}