using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Web.Internal.AccessLevel;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/liane")]
[ApiController]
[RequiresAuth]
public sealed class EventController : ControllerBase
{
  private readonly IEventService eventService;

  public EventController(IEventService eventService)
  {
    this.eventService = eventService;
  }

  [HttpPost("{id}/event")]
  public async Task<Event> Join([FromRoute] string id, [FromBody] LianeEvent lianeEvent)
  {
    return await eventService.Create(id, lianeEvent);
  }

  [HttpGet("{id}/event")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<PaginatedResponse<Event>> ListForLiane([FromRoute] string id, [FromQuery] Pagination pagination)
  {
    return await eventService.List(new EventFilter(true, id), pagination);
  }

  [HttpGet("event/{id}")]
  public async Task<Event> GetEvent([FromRoute] string id)
  {
    return await eventService.Get(id);
  }

  [HttpPost("event/{id}")]
  public async Task<Event> Answer([FromRoute] string id, [FromQuery] LianeEvent lianeEvent)
  {
    return await eventService.Answer(id, lianeEvent);
  }

  [HttpGet("event")]
  public async Task<PaginatedResponse<Event>> ListForCurrentUser([FromQuery] Pagination pagination)
  {
    return await eventService.List(new EventFilter(true, null), pagination);
  }

  [HttpPut("event/{id}")]
  public Task MarkAsRead([FromRoute] string id)
  {
    return eventService.MarkAsRead(id);
  }
}