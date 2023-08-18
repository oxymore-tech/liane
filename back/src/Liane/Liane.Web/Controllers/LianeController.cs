using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Mock;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using Liane.Web.Internal.Auth;
using Liane.Web.Internal.Debug;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/liane")]
[ApiController]
[RequiresAuth]
public sealed class LianeController : ControllerBase
{
  private readonly ILianeService lianeService;
  private readonly ICurrentContext currentContext;
  private readonly IMockService mockService;
  private readonly EventDispatcher eventDispatcher;
  private readonly ILianeRecurrenceService lianeRecurrenceService;

  public LianeController(ILianeService lianeService, ICurrentContext currentContext, IMockService mockService, EventDispatcher eventDispatcher, ILianeRecurrenceService lianeRecurrenceService)
  {
    this.lianeService = lianeService;
    this.currentContext = currentContext;
    this.mockService = mockService;
    this.eventDispatcher = eventDispatcher;
    this.lianeRecurrenceService = lianeRecurrenceService;
  }

  [HttpGet("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<Api.Trip.Liane> Get([FromRoute] string id)
  {
    var current = currentContext.CurrentResource<Api.Trip.Liane>();
    return current ?? await lianeService.Get(id);
  }

  [HttpDelete("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Owner, typeof(Api.Trip.Liane))]
  public async Task Delete([FromRoute] string id)
  {
    await lianeService.Delete(id);
  }

  [HttpPatch("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task Reschedule([FromRoute] string id, [FromBody] DateTime departureTime)
  {
    await lianeService.UpdateDepartureTime(id, departureTime);
  }
  
  [HttpPost("{id}/cancel")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task CancelLiane([FromRoute] string id)
  {
    await eventDispatcher.Dispatch(new LianeEvent.MemberHasCanceled(id, currentContext.CurrentUser().Id));
  }

  [HttpDelete("{id}/members/{memberId}")]
  public async Task Delete([FromRoute] string id, [FromRoute] string memberId)
  {
    // For now only allow user himself
    if (currentContext.CurrentUser().Id != memberId) throw new ForbiddenException();
    await eventDispatcher.Dispatch(new LianeEvent.MemberHasLeft(id, memberId));
  }

  [HttpGet("{id}/members/{memberId}/contact")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public Task<string> GetContact([FromRoute] string id, [FromRoute] string memberId)
  {
    return lianeService.GetContact(id, currentContext.CurrentUser().Id, memberId);
  }

  [HttpPost("{id}/feedback")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<IActionResult> SendFeedback([FromRoute] string id, [FromBody] Feedback feedback)
  {
    await lianeService.UpdateFeedback(id, feedback);
    return NoContent();
  }

  [HttpGet("display/geojson")]
  public Task<FeatureCollection> DisplayGeoJson([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double lat2, [FromQuery] double lng2, [FromQuery] long? after,
    CancellationToken cancellationToken)
  {
    //TODO remove
    return Task.FromResult(new FeatureCollection());
  }

  [HttpPost("match")]
  [DebugRequest]
  public Task<PaginatedResponse<LianeMatch>> Match([FromBody] Filter filter, [FromQuery] Pagination pagination, CancellationToken cancellationToken)
  {
    return lianeService.Match(filter, pagination, cancellationToken);
  }

  [HttpPost("match/geojson")] //TODO use query option
  [DebugRequest]
  public Task<LianeMatchDisplay> MatchWithDisplay([FromBody] Filter filter, [FromQuery] Pagination pagination, CancellationToken cancellationToken)
  {
    return lianeService.MatchWithDisplay(filter, pagination, cancellationToken);
  }

  [HttpPost("links")]
  public async Task<ImmutableList<ClosestPickups>> GetNear([FromBody] LinkFilterPayload payload)
  {
    return await lianeService.GetPickupLinks(payload);
  }

  [HttpGet("")]
  public Task<PaginatedResponse<Api.Trip.Liane>> List([FromQuery] Pagination pagination, [FromQuery(Name = "state")] LianeState[] stateFilter, CancellationToken cancellationToken)
  {
    return lianeService.List(new LianeFilter { ForCurrentUser = true, States = stateFilter }, pagination, cancellationToken);
  }

  [HttpPost("")]
  public Task<Api.Trip.Liane> Create(LianeRequest lianeRequest)
  {
    return lianeService.Create(lianeRequest);
  }

  [HttpGet("all")]
  [RequiresAdminAuth]
  public Task<PaginatedResponse<Api.Trip.Liane>> ListAll([FromQuery] Pagination pagination, CancellationToken cancellationToken)
  {
    return lianeService.List(new LianeFilter(), pagination, cancellationToken);
  }

  [HttpPost("generate")]
  [RequiresAdminAuth]
  public async Task<ImmutableList<Api.Trip.Liane>> Generate([FromQuery] int count, [FromQuery] double lat, [FromQuery] double lng, [FromQuery] double? lat2, [FromQuery] double? lng2,
    [FromQuery] int? radius)
  {
    var from = new LatLng(lat, lng);
    LatLng? to = null;
    if (lat2 != null && lng2 != null)
    {
      to = new LatLng((double)lat2, (double)lng2);
    }

    return await mockService.GenerateLianes(count, from, to, radius);
  }
  
      
  [HttpGet("recurrence")]
  public Task<ImmutableList<LianeRecurrence>> ListRecurrences()
  {
    return lianeRecurrenceService.ListForCurrentUser();
  }
  
  [HttpGet("recurrence/{id}")]
  public Task<LianeRecurrence> GetRecurrence([FromRoute] string id)
  {
    return lianeRecurrenceService.GetWithResolvedRefs(id);
  }

    
  [HttpDelete("recurrence/{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Owner, typeof(LianeRecurrence))]
  public async Task RemoveRecurrence([FromRoute] string id)
  {
      await lianeRecurrenceService.Delete(id);
      await lianeService.RemoveRecurrence(id);
  }
  
      
  [HttpPatch("recurrence/{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Owner, typeof(LianeRecurrence))]
  public async Task UpdateRecurrence([FromRoute] string id, [FromBody] DayOfTheWeekFlag days)
  {
    // Deactivate recurrence while cleaning up old lianes
    await lianeRecurrenceService.Update(id, DayOfTheWeekFlag.Create(new HashSet<DayOfWeek>()));
    await lianeService.RemoveRecurrence(id);
    // If flag is all 0, we stop here, else reactivate recurrence and create lianes
    if (!days.IsNever)
    {
      await lianeService.CreateFromRecurrence(id);
      await lianeRecurrenceService.Update(id, days);
    }
  }

}