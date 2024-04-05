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

[Route("api/trip")]
[ApiController]
[RequiresAuth]
public sealed class TripController(
  ITripService tripService,
  ICurrentContext currentContext,
  IMockService mockService,
  EventDispatcher eventDispatcher,
  ITripRecurrenceService tripRecurrenceService,
  ITripTrackerService tripTrackerService)
  : ControllerBase
{
  [HttpGet("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public async Task<Trip> Get([FromRoute] string id)
  {
    var current = currentContext.CurrentResource<Trip>();
    return await tripService.GetForCurrentUser(current is not null ? current : id);
  }

  [HttpDelete("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Owner, typeof(Trip))]
  public async Task Delete([FromRoute] string id)
  {
    await tripService.Delete(id);
  }

  [HttpPatch("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public Task<Trip> Update([FromRoute] string id, [FromBody] TripUpdate update)
  {
    return tripService.UpdateDepartureTime(id, update.DepartureTime);
  }

  [HttpPost("{id}/cancel")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public async Task<IActionResult> CancelLiane([FromRoute] string id)
  {
    await tripService.CancelTrip(id);
    await eventDispatcher.Dispatch(new TripEvent.MemberHasCanceled(id, currentContext.CurrentUser().Id));
    return NoContent();
  }

  [HttpPost("{id}/start")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public async Task<IActionResult> StartLiane([FromRoute] string id)
  {
    await tripService.StartTrip(id);
    await eventDispatcher.Dispatch(new TripEvent.MemberHasStarted(id, currentContext.CurrentUser().Id));
    return NoContent();
  }


  [HttpPost("{id}/leave")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public async Task<IActionResult> LeaveLiane([FromRoute] string id)
  {
    var memberId = currentContext.CurrentUser().Id;
    await tripService.RemoveMember(id, memberId);
    await eventDispatcher.Dispatch(new TripEvent.MemberHasLeft(id, memberId));
    return NoContent();
  }

  [HttpGet("{id}/members/{memberId}/contact")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public Task<string> GetContact([FromRoute] string id, [FromRoute] string memberId)
  {
    return tripService.GetContact(id, currentContext.CurrentUser().Id, memberId);
  }

  [HttpPost("{id}/feedback")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public async Task<IActionResult> SendFeedback([FromRoute] string id, [FromBody] Feedback feedback)
  {
    await tripService.UpdateFeedback(id, feedback);
    return NoContent();
  }


  [HttpGet("{id}/geolocation")]
  public Task<FeatureCollection> GetGeolocationPings([FromRoute] string id, [FromQuery] bool raw = true)
  {
    return currentContext.CurrentUser().IsAdmin
      ? (raw ? tripService.GetRawGeolocationPings(id) : tripTrackerService.GetGeolocationPings(id))
      : tripTrackerService.GetGeolocationPingsForCurrentUser(id);
  }

  [HttpPatch("{id}/geolocation")]
  public async Task<IActionResult> UpdateGeolocationSetting([FromRoute] string id, [FromBody] GeolocationLevel level)
  {
    await tripService.UpdateGeolocationSetting(id, level);
    return NoContent();
  }

  [HttpPost("sync")]
  [RequiresAdminAuth]
  public Task ForceSyncDatabase()
  {
    return tripService.ForceSyncDatabase();
  }


  [HttpPost("match")]
  [DebugRequest]
  public Task<PaginatedResponse<TripMatch>> Match([FromBody] Filter filter, [FromQuery] Pagination pagination, CancellationToken cancellationToken)
  {
    return tripService.Match(filter, pagination, cancellationToken);
  }

  [HttpPost("match/geojson")]
  [DebugRequest]
  public Task<LianeMatchDisplay> MatchWithDisplay([FromBody] Filter filter, [FromQuery] Pagination pagination, CancellationToken cancellationToken)
  {
    return tripService.MatchWithDisplay(filter, pagination, cancellationToken);
  }

  [HttpGet("")]
  public Task<PaginatedResponse<Trip>> List([FromQuery] Pagination pagination, [FromQuery(Name = "state")] TripState[] stateFilter, CancellationToken cancellationToken)
  {
    return tripService.List(new TripFilter { ForCurrentUser = true, States = stateFilter }, pagination, cancellationToken);
  }

  [HttpPost("")]
  public Task<Trip> Create(TripRequest tripRequest)
  {
    return tripService.Create(tripRequest);
  }

  [HttpGet("all")]
  [RequiresAdminAuth]
  public Task<PaginatedResponse<Trip>> ListAll([FromQuery] Pagination pagination, CancellationToken cancellationToken)
  {
    return tripService.List(new TripFilter(), pagination, cancellationToken);
  }

  [HttpPost("generate")]
  [RequiresAdminAuth]
  public async Task<ImmutableList<Trip>> Generate([FromQuery] int count, [FromQuery] double lat, [FromQuery] double lng, [FromQuery] double? lat2, [FromQuery] double? lng2,
    [FromQuery] int? radius)
  {
    var from = new LatLng(lat, lng);
    LatLng? to = null;
    if (lat2 != null && lng2 != null)
    {
      to = new LatLng((double)lat2, (double)lng2);
    }

    return await mockService.GenerateTrips(count, from, to, radius);
  }


  [HttpGet("recurrence")]
  public Task<ImmutableList<TripRecurrence>> ListRecurrences()
  {
    return tripRecurrenceService.ListForCurrentUser();
  }

  [HttpGet("recurrence/{id}")]
  public Task<TripRecurrence> GetRecurrence([FromRoute] string id)
  {
    return tripRecurrenceService.GetWithResolvedRefs(id);
  }


  [HttpDelete("recurrence/{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Owner, typeof(TripRecurrence))]
  public async Task RemoveRecurrence([FromRoute] string id)
  {
    await tripRecurrenceService.Delete(id);
    await tripService.RemoveRecurrence(id);
  }

  [HttpPatch("recurrence/{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Owner, typeof(TripRecurrence))]
  public async Task UpdateRecurrence([FromRoute] string id, [FromBody] DayOfWeekFlag days)
  {
    // Deactivate recurrence while cleaning up old lianes
    await tripRecurrenceService.Update(id, DayOfWeekFlag.Empty);
    await tripService.RemoveRecurrence(id);
    // If flag is all 0, we stop here, else reactivate recurrence and create lianes
    if (!days.IsEmpty())
    {
      await tripRecurrenceService.Update(id, days);
      await tripService.CreateFromRecurrence(id);
    }
  }

  [HttpGet("record")]
  [RequiresAdminAuth]
  public Task<PaginatedResponse<DetailedTripTrackReport>> ListTripRecords([FromQuery] Pagination pagination, [FromQuery] TripRecordFilter filter)
  {
    return tripService.ListTripRecords(pagination, filter);
  }

  [HttpGet("record/{id}")]
  [RequiresAdminAuth]
  public Task<DetailedTripTrackReport> GetRecord([FromRoute] string id)
  {
    return tripService.GetTripRecord(id);
  }

  [HttpPost("record/{id}/recreate")]
  [RequiresAdminAuth]
  public Task RecreateReport([FromRoute] string id)
  {
    return tripTrackerService.RecreateReport(id);
  }
}