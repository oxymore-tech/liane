using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/rallying_point")]
[ApiController]
[RequiresAuth]
public sealed class RallyingPointController : ControllerBase
{
  private readonly IRallyingPointService rallyingPointService;

  public RallyingPointController(IRallyingPointService rallyingPointService)
  {
    this.rallyingPointService = rallyingPointService;
  }

  [HttpPost("")]
  [RequiresAdminAuth]
  public async Task<RallyingPoint> Create([FromBody] RallyingPoint rallyingPoint)
  {
    return await rallyingPointService.Create(rallyingPoint);
  }

  [HttpDelete("{id}")]
  [RequiresAdminAuth]
  public async Task Delete(string id)
  {
    await rallyingPointService.Delete(id);
  }

  [HttpPut("{id}")]
  [RequiresAdminAuth]
  public async Task Update([FromQuery] string id, [FromBody] RallyingPoint rallyingPoint)
  {
    await rallyingPointService.Update(id, rallyingPoint);
  }

  [HttpPost("generate")]
  [RequiresAdminAuth]
  public async Task Generate()
  {
    await rallyingPointService.Generate();
  }

  [HttpGet("")]
  [DisableAuth]
  public async Task<ImmutableList<RallyingPoint>> List(
    [FromQuery] double? lat, [FromQuery] double? lng,
    [FromQuery] double? lat2, [FromQuery] double? lng2,
    [FromQuery] int? distance = null,
    [FromQuery] int? limit = 10,
    [FromQuery] string? search = null)
  {
    LatLng? from = null;
    if (lat != null && lng != null)
    {
      from = new LatLng((double)lat, (double)lng);
    }

    LatLng? to = null;
    if (lat2 != null && lng2 != null)
    {
      to = new LatLng((double)lat2, (double)lng2);
    }

    return await rallyingPointService.List(from, to, distance, search, limit);
  }

  [HttpGet("snap")]
  [DisableAuth]
  public async Task<RallyingPoint?> Snap([FromQuery] double lat, [FromQuery] double lng)
  {
    return await rallyingPointService.Snap(new(lat, lng), IRallyingPointService.MaxRadius);
  }
}