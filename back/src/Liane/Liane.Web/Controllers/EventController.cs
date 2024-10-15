using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip.Geolocation;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/event")]
[ApiController]
[RequiresAuth]
public sealed class EventController(ILianeTrackerService trackerService) : ControllerBase
{
  [HttpPost("member_ping")]
  public async Task Create([FromBody] MemberPing ping)
  {
    await trackerService.SendPing(ping);
  }
}