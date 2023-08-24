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
  private readonly IRallyingPointGenerator rallyingPointGenerator;

  public RallyingPointController(IRallyingPointService rallyingPointService, IRallyingPointGenerator rallyingPointGenerator)
  {
    this.rallyingPointService = rallyingPointService;
    this.rallyingPointGenerator = rallyingPointGenerator;
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
  public Task Generate()
  {
    return rallyingPointGenerator.Generate();
  }

  [HttpGet("")]
  [DisableAuth]
  public async Task<ImmutableList<RallyingPoint>> List(
    [FromQuery] double? lat, [FromQuery] double? lng,
    [FromQuery] int? distance = null,
    [FromQuery] int? limit = 10,
    [FromQuery] string? search = null)
  {
    LatLng? from = null;
    if (lat != null && lng != null)
    {
      from = new LatLng((double)lat, (double)lng);
    }

    return await rallyingPointService.List(from, distance: distance, search: search, limit: limit);
  }

  [HttpGet("snap")]
  [DisableAuth]
  public async Task<RallyingPoint?> Snap([FromQuery] double lat, [FromQuery] double lng)
  {
    return await rallyingPointService.Snap(new(lat, lng), IRallyingPointService.MaxRadius);
  }
}