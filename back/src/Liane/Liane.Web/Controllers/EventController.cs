using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Web.Internal.AccessLevel;
using Liane.Web.Internal.Auth;
using Liane.Web.Internal.Debug;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/event")]
[ApiController]
[RequiresAuth]
public sealed class EventController : ControllerBase
{
  private readonly IEventService eventService;
  private readonly ILianeRequestService lianeRequestService;

  public EventController(IEventService eventService, ILianeRequestService lianeRequestService)
  {
    this.eventService = eventService;
    this.lianeRequestService = lianeRequestService;
  }

  [HttpPost("")]
  public async Task<Event> Create([FromBody] LianeEvent lianeEvent)
  {
    return await eventService.Create(lianeEvent);
  }

  [HttpGet("liane/{id}/{type}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<PaginatedResponse<Event>> ListForLiane([FromRoute] string id, [FromRoute] TypeOf<LianeEvent>? type, [FromQuery] Pagination pagination)
  {
    return await eventService.List(new EventFilter(true, id, type), pagination);
  }

  [HttpGet("join_request")]
  public async Task<PaginatedResponse<JoinLianeRequest>> ListJoinRequest([FromQuery] Pagination pagination)
  {
    return await lianeRequestService.List(pagination);
  }
  
  [HttpGet("join_request/{id}")]
  public async Task<JoinLianeRequest> ListJoinRequest([FromRoute] string id)
  {
    return await lianeRequestService.Get(id);
  }

  [HttpGet("{id}")]
  public async Task<Event> Get([FromRoute] string id)
  {
    return await eventService.Get(id);
  }

  [HttpPost("{id}")]
  [DebugRequest]
  public async Task<Event> Answer([FromRoute] string id, [FromBody] LianeEvent lianeEvent)
  {
    return await eventService.Answer(id, lianeEvent);
  }

  [HttpGet("")]
  public async Task<PaginatedResponse<Event>> ListForCurrentUser([FromQuery] Pagination pagination)
  {
    return await eventService.List(new EventFilter(true, null, null), pagination);
  }

  [HttpPatch("{id}")]
  public Task MarkAsRead([FromRoute] string id)
  {
    return eventService.MarkAsRead(id);
  }
}