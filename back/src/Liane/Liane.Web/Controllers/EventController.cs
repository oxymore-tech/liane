using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Event;
using Liane.Web.Internal.Auth;
using Liane.Web.Internal.Debug;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/event")]
[ApiController]
[RequiresAuth]
public sealed class EventController : ControllerBase
{
  private readonly EventDispatcher eventDispatcher;
  private readonly IJoinRequestService joinRequestService;

  public EventController(IJoinRequestService joinRequestService, EventDispatcher eventDispatcher)
  {
    this.joinRequestService = joinRequestService;
    this.eventDispatcher = eventDispatcher;
  }

  [HttpPost("join_request")]
  [DebugRequest]
  public async Task<IActionResult> Create([FromBody] TripEvent.JoinRequest lianeEvent)
  {
    await eventDispatcher.Dispatch(lianeEvent);
    return NoContent();
  }
  
  [HttpPost("member_ping")]
  public async Task<IActionResult> Create([FromBody] TripEvent.MemberPing lianeEvent)
  {
    await eventDispatcher.Dispatch(lianeEvent);
    return NoContent();
  }


  [HttpGet("join_request")]
  public async Task<PaginatedResponse<JoinTripRequest>> ListJoinRequest([FromQuery] Pagination pagination)
  {
    return await joinRequestService.List(pagination);
  }

  [HttpGet("join_request/{id}")]
  public async Task<JoinTripRequest> GetJoinRequest([FromRoute] string id)
  {
    return await joinRequestService.Get(id);
  }

  [HttpDelete("join_request/{id}")]
  public async Task Delete([FromRoute] string id)
  {
    await joinRequestService.Delete(id);
  }
}