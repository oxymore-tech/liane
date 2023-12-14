using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Mock;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip.Geolocation;
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
  private readonly ILianeTrackerService lianeTrackerService;

  public LianeController(ILianeService lianeService, ICurrentContext currentContext, IMockService mockService, EventDispatcher eventDispatcher, ILianeRecurrenceService lianeRecurrenceService, ILianeTrackerService lianeTrackerService)
  {
    this.lianeService = lianeService;
    this.currentContext = currentContext;
    this.mockService = mockService;
    this.eventDispatcher = eventDispatcher;
    this.lianeRecurrenceService = lianeRecurrenceService;
    this.lianeTrackerService = lianeTrackerService;
  }

  [HttpGet("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<Api.Trip.Liane> Get([FromRoute] string id)
  {
    var current = currentContext.CurrentResource<Api.Trip.Liane>();
    return await lianeService.GetForCurrentUser(current is not null? current : id);
  }

  [HttpDelete("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Owner, typeof(Api.Trip.Liane))]
  public async Task Delete([FromRoute] string id)
  {
    await lianeService.Delete(id);
  }

  [HttpPatch("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public Task<Api.Trip.Liane> Update([FromRoute] string id, [FromBody] LianeUpdate update)
  {
    return lianeService.UpdateDepartureTime(id, update.DepartureTime);
  }
  
  [HttpPost("{id}/cancel")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<IActionResult> CancelLiane([FromRoute] string id)
  {
    await lianeService.CancelLiane(id);
    await eventDispatcher.Dispatch(new LianeEvent.MemberHasCanceled(id, currentContext.CurrentUser().Id));
    return NoContent();
  }
  
  [HttpPost("{id}/start")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<IActionResult> StartLiane([FromRoute] string id)
  {
    await lianeService.StartLiane(id);
    await eventDispatcher.Dispatch(new LianeEvent.MemberHasStarted(id, currentContext.CurrentUser().Id));
    return NoContent();
  }

   
  [HttpPost("{id}/leave")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<IActionResult> LeaveLiane([FromRoute] string id)
  {
    var memberId = currentContext.CurrentUser().Id;
    await lianeService.RemoveMember(id, memberId);
    await eventDispatcher.Dispatch(new LianeEvent.MemberHasLeft(id, memberId));
    return NoContent();
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

  
  [HttpGet("{id}/geolocation")]
  public Task<FeatureCollection> GetGeolocationPings([FromRoute] string id, [FromQuery] bool raw = true)
  {
    return currentContext.CurrentUser().IsAdmin ? 
      (raw ? lianeService.GetRawGeolocationPings(id) : lianeTrackerService.GetGeolocationPings(id)) : 
      lianeTrackerService.GetGeolocationPingsForCurrentUser(id);
  }
  
  [HttpPatch("{id}/geolocation")]
  public async Task<IActionResult> UpdateGeolocationSetting([FromRoute] string id, [FromBody] GeolocationLevel level)
  {
    await lianeService.UpdateGeolocationSetting(id, level);
    return NoContent();
  }
  
  [HttpPost("sync")]
  [RequiresAdminAuth]
  public Task ForceSyncDatabase()
  {
    return lianeService.ForceSyncDatabase();
  }


  [HttpPost("match")]
  [DebugRequest]
  public Task<PaginatedResponse<LianeMatch>> Match([FromBody] Filter filter, [FromQuery] Pagination pagination, CancellationToken cancellationToken)
  {
    return lianeService.Match(filter, pagination, cancellationToken);
  }

  [HttpPost("match/geojson")]
  [DebugRequest]
  public Task<LianeMatchDisplay> MatchWithDisplay([FromBody] Filter filter, [FromQuery] Pagination pagination, CancellationToken cancellationToken)
  {
    return lianeService.MatchWithDisplay(filter, pagination, cancellationToken);
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
      await lianeRecurrenceService.Update(id, days);
      await lianeService.CreateFromRecurrence(id);
    }
  }

  [HttpGet("record")]
  [RequiresAdminAuth]
  public Task<PaginatedResponse<DetailedLianeTrackReport>> ListTripRecords([FromQuery] Pagination pagination, [FromQuery] TripRecordFilter filter)
  {
    return lianeService.ListTripRecords(pagination, filter);
  }
  
  [HttpGet("record/{id}")]
  [RequiresAdminAuth]
  public Task<DetailedLianeTrackReport> GetRecord([FromRoute]string id)
  {
    return lianeService.GetTripRecord(id);
  }
  
  [HttpPost("record/{id}/recreate")]
  [RequiresAdminAuth]
  public Task  RecreateReport([FromRoute]string id)
  {
    return  lianeTrackerService.RecreateReport(id);
  }
}