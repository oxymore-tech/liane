using System.Collections.Immutable;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/rallying_point")]
[ApiController]
[RequiresAuth]
public sealed class RallyingPointController(
  IRallyingPointService rallyingPointService,
  IRallyingPointGenerator rallyingPointGenerator,
  ICurrentContext currentContext,
  IRallyingPointRequestService rallyingPointRequestService)
  : ControllerBase
{
  [HttpPost("")]
  [RequiresAdminAuth]
  public async Task<RallyingPoint> Create([FromBody] RallyingPoint rallyingPoint)
  {
    return await rallyingPointService.Create(rallyingPoint);
  }

  [HttpDelete("{id}")]
  [RequiresAdminAuth]
  public async Task Delete([FromRoute] string id)
  {
    await rallyingPointService.Delete(id);
  }

  [HttpPatch("{id}")]
  [RequiresAdminAuth]
  public async Task Update([FromRoute] string id, [FromBody] RallyingPoint rallyingPoint)
  {
    await rallyingPointService.Update(id, rallyingPoint);
  }

  [HttpGet("{id}/stats")]
  [RequiresAdminAuth]
  public Task<RallyingPointStats> GetStats([FromRoute] string id)
  {
    return rallyingPointService.GetStats(id);
  }


  [HttpPost("generate")]
  [RequiresAdminAuth]
  public Task Generate([FromQuery(Name = "source")] string[] sources)
  {
    return rallyingPointGenerator.Generate(sources.ToImmutableList());
  }

  [HttpGet("")]
  public async Task<PaginatedResponse<RallyingPoint>> List([FromQuery] RallyingPointFilter rallyingPointFilter)
  {
    return await rallyingPointService.List(rallyingPointFilter);
  }

  [HttpGet("department/{n}")]
  [RequiresAdminAuth]
  public async Task<FeatureCollection> GetPointsInDepartment([FromRoute] string n)
  {
    return await rallyingPointService.GetDepartment(n);
  }

  [HttpGet("snap")]
  public async Task<RallyingPoint?> Snap([FromQuery] double lat, [FromQuery] double lng)
  {
    return await rallyingPointService.Snap(new  LatLng(lat, lng), IRallyingPointService.MaxRadius);
  }

  [HttpGet("export")]
  [RequiresAdminAuth]
  public PushStreamHttpResult ExportCsv([FromQuery] RallyingPointFilter rallyingPointFilter)
  {
    return TypedResults.Stream(
      o => rallyingPointService.ExportCsv(o, rallyingPointFilter),
      "text/csv",
      "rallying_point.csv"
    );
  }

  [HttpPost("import")]
  [RequiresAdminAuth]
  public async Task ImportCsv(IFormFile file)
  {
    await using var input = file.OpenReadStream();
    await rallyingPointService.ImportCsv(input);
  }

  [HttpGet("request/all")]
  [RequiresAdminAuth]
  public Task<PaginatedResponse<RallyingPointRequest>> ListAllRequests(Pagination pagination)
  {
    return rallyingPointRequestService.Paginate(pagination);
  }

  [HttpGet("request/department/{n}")]
  [RequiresAdminAuth]
  public async Task<FeatureCollection> GetRequestsInDepartment([FromRoute] string n)
  {
    return await rallyingPointRequestService.GetDepartment(n);
  }

  [HttpGet("request")]
  public Task<PaginatedResponse<RallyingPointRequest>> ListRequests(Pagination pagination)
  {
    return rallyingPointRequestService.ListForCurrentUser(pagination);
  }

  [HttpPost("request")]
  public Task<RallyingPointRequest> CreateRequest([FromBody] RallyingPointRequest req)
  {
    return rallyingPointRequestService.Create(req with { Status = null });
  }

  [HttpDelete("request/{id}")]
  [RequiresAdminAuth]
  public Task DeleteRequest([FromRoute] string id)
  {
    return rallyingPointRequestService.Delete(id);
  }
  
  [HttpPatch("request/{id}")]
  [RequiresAdminAuth]
  public Task<RallyingPointRequest> UpdateRequestStatus([FromRoute] string id, [FromBody] RallyingPointRequestStatus status)
  {
    return rallyingPointRequestService.UpdateRequestStatus(id, status with { By = currentContext.CurrentUser().Id });
  }
  
}