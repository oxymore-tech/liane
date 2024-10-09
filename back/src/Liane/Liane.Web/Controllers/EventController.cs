using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Service.Internal.Event;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/event")]
[ApiController]
[RequiresAuth]
public sealed class EventController(EventDispatcher eventDispatcher) : ControllerBase
{
  [HttpPost("member_ping")]
  public async Task<IActionResult> Create([FromBody] LianeEvent.MemberPing lianeEvent)
  {
    await eventDispatcher.Dispatch(lianeEvent);
    return NoContent();
  }
}