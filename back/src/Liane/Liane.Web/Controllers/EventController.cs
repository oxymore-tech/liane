using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Event;
using Liane.Web.Internal.Auth;
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

  [HttpPost("")]
  public Task Create([FromBody] LianeEvent lianeEvent)
  {
    return eventDispatcher.Dispatch(lianeEvent);
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