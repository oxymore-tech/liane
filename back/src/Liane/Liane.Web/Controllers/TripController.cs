using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
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
  ILianeTrackerService lianeTrackerService)
  : ControllerBase
{
  [HttpGet("{id}")]
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
  public Task<Trip> Update([FromRoute] string id, [FromBody] LianeUpdate update)
  {
    return tripService.UpdateDepartureTime(id, update.DepartureTime);
  }

  [HttpPost("{id}/cancel")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public async Task CancelLiane([FromRoute] string id)
  {
    await tripService.CancelTrip(id);
  }

  [HttpPost("{id}/start")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public async Task StartLiane([FromRoute] string id)
  {
    await tripService.StartTrip(id);
  }

  [HttpPost("{id}/leave")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Trip))]
  public async Task<IActionResult> LeaveLiane([FromRoute] string id)
  {
    var memberId = currentContext.CurrentUser().Id;
    await tripService.RemoveMember(id, memberId);
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
      ? (raw ? tripService.GetRawGeolocationPings(id) : lianeTrackerService.GetGeolocationPings(id))
      : lianeTrackerService.GetGeolocationPingsForCurrentUser(id);
  }

  [HttpPatch("{id}/geolocation")]
  public async Task<IActionResult> UpdateGeolocationSetting([FromRoute] string id, [FromBody] GeolocationLevel level)
  {
    await tripService.UpdateGeolocationSetting(id, level);
    return NoContent();
  }

  [HttpPost("match")]
  [DebugRequest]
  public Task<PaginatedResponse<LianeMatch>> Match([FromBody] Filter filter, [FromQuery] Pagination pagination, CancellationToken cancellationToken)
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
  public Task<PaginatedResponse<Trip>> List([FromQuery] Pagination pagination, [FromQuery(Name = "state")] TripStatus[] stateFilter, CancellationToken cancellationToken)
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

  [HttpGet("record")]
  [RequiresAdminAuth]
  public Task<PaginatedResponse<DetailedLianeTrackReport>> ListTripRecords([FromQuery] Pagination pagination, [FromQuery] TripRecordFilter filter)
  {
    return tripService.ListTripRecords(pagination, filter);
  }

  [HttpGet("record/{id}")]
  [RequiresAdminAuth]
  public Task<DetailedLianeTrackReport> GetRecord([FromRoute] string id)
  {
    return tripService.GetTripRecord(id);
  }

  [HttpPost("record/{id}/recreate")]
  [RequiresAdminAuth]
  public Task RecreateReport([FromRoute] string id)
  {
    return lianeTrackerService.RecreateReport(id);
  }
}