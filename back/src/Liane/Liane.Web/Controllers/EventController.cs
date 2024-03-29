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
  private readonly ILianeRequestService lianeRequestService;

  public EventController(ILianeRequestService lianeRequestService, EventDispatcher eventDispatcher)
  {
    this.lianeRequestService = lianeRequestService;
    this.eventDispatcher = eventDispatcher;
  }

  [HttpPost("join_request")]
  [DebugRequest]
  public async Task<IActionResult> Create([FromBody] LianeEvent.JoinRequest lianeEvent)
  {
    await eventDispatcher.Dispatch(lianeEvent);
    return NoContent();
  }
  
  [HttpPost("member_ping")]
  public async Task<IActionResult> Create([FromBody] LianeEvent.MemberPing lianeEvent)
  {
    await eventDispatcher.Dispatch(lianeEvent);
    return NoContent();
  }


  [HttpGet("join_request")]
  public async Task<PaginatedResponse<JoinLianeRequest>> ListJoinRequest([FromQuery] Pagination pagination)
  {
    return await lianeRequestService.List(pagination);
  }

  [HttpGet("join_request/{id}")]
  public async Task<JoinLianeRequest> GetJoinRequest([FromRoute] string id)
  {
    return await lianeRequestService.Get(id);
  }

  [HttpDelete("join_request/{id}")]
  public async Task Delete([FromRoute] string id)
  {
    await lianeRequestService.Delete(id);
  }
}