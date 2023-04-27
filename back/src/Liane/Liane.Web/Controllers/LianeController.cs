using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Mock;
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

  public LianeController(ILianeService lianeService, ICurrentContext currentContext, IMockService mockService)
  {
    this.lianeService = lianeService;
    this.currentContext = currentContext;
    this.mockService = mockService;
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
  public async Task  Delete([FromRoute] string id)
  {
     await lianeService.Delete(id);
  }

  [HttpPatch("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task  UpdateDeparture([FromRoute] string id, [FromBody] DateTime departureTime)
  {
    await lianeService.UpdateDepartureTime(id, departureTime);
  }

  [HttpGet("display")] // Rename to filter ? + return FeatureCollection instead of Segments ?
  public async Task<LianeDisplay> Display([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double lat2, [FromQuery] double lng2, [FromQuery] long? after)
  {
    var from = new LatLng(lat, lng);
    var to = new LatLng(lat2, lng2);
    var dateTime = after is null ? DateTime.Now : DateTimeOffset.FromUnixTimeMilliseconds(after.Value).UtcDateTime;
    return await lianeService.Display(from, to, dateTime);
  }
  
  [HttpGet("display/geojson")]
  public async Task<FeatureCollection> DisplayGeoJson([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double lat2, [FromQuery] double lng2, [FromQuery] long? after)
  {
    var from = new LatLng(lat, lng);
    var to = new LatLng(lat2, lng2);
    var dateTime = after is null ? DateTime.Now : DateTimeOffset.FromUnixTimeMilliseconds(after.Value).UtcDateTime;
    return await lianeService.DisplayGeoJSON(from, to, dateTime);
  }

  [HttpPost("match")]
  [DebugRequest]
  public Task<PaginatedResponse<LianeMatch>> Match([FromBody] Filter filter, [FromQuery] Pagination pagination)
  {
    return lianeService.Match(filter, pagination);
  }

  [HttpPost("match/geojson")] //TODO use query option
  [DebugRequest]
  public Task<LianeMatchDisplay> MatchWithDisplay([FromBody] Filter filter, [FromQuery] Pagination pagination)
  {
    return lianeService.MatchWithDisplay(filter, pagination);
  }


  [HttpGet("links")]
  public async Task<ImmutableList<ClosestPickups>> GetNear([FromQuery] double? lat, [FromQuery] double? lng, [FromQuery] int? radius, [FromQuery] long? after = null)
  {
    var dateTime = after is null ? DateTime.Now : DateTimeOffset.FromUnixTimeMilliseconds(after.Value).UtcDateTime;

    var from = new LatLng(lat!.Value, lng!.Value);
    return await lianeService.GetNearestLinks(from, dateTime, radius ?? 30_000);


  }

  [HttpGet("")]
  public Task<PaginatedResponse<Api.Trip.Liane>> List([FromQuery] Pagination pagination)
  {
    return lianeService.ListForCurrentUser(pagination);
  }

  [HttpPost("")]
  public Task<Api.Trip.Liane> Create(LianeRequest lianeRequest)
  {
    return lianeService.Create(lianeRequest, currentContext.CurrentUser().Id);
  }

  [HttpGet("all")]
  [RequiresAdminAuth]
  public Task<PaginatedResponse<Api.Trip.Liane>> ListAll([FromQuery] Pagination pagination)
  {
    return lianeService.ListAll(pagination);
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
}
