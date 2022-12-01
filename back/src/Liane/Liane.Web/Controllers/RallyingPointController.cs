using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.RallyingPoint;
using Liane.Api.Routing;
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
        await rallyingPointService.ImportCities();
    }

    [HttpGet("")]
    [DisableAuth]
    public async Task<ImmutableList<RallyingPoint>> List([FromQuery] double? lat, [FromQuery] double? lng, [FromQuery] string? search = null)
    {
        LatLng? latLng = null;
        if (lat != null && lng != null)
        {
            latLng = new LatLng((double)lat, (double)lng);
        }

        return await rallyingPointService.List(latLng, search);
    }
}