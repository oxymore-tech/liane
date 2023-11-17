using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/rallying_point")]
[ApiController]
[RequiresAuth]
public sealed class RallyingPointController : ControllerBase
{
  private readonly IRallyingPointService rallyingPointService;
  private readonly IRallyingPointGenerator rallyingPointGenerator;
  private readonly ICurrentContext currentContext;
  private readonly IRallyingPointRequestService rallyingPointRequestService;

  public RallyingPointController(IRallyingPointService rallyingPointService, IRallyingPointGenerator rallyingPointGenerator, ICurrentContext currentContext,
    IRallyingPointRequestService rallyingPointRequestService)
  {
    this.rallyingPointService = rallyingPointService;
    this.rallyingPointGenerator = rallyingPointGenerator;
    this.currentContext = currentContext;
    this.rallyingPointRequestService = rallyingPointRequestService;
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
  public Task Generate([FromQuery(Name = "source")] string[] sources)
  {
    return rallyingPointGenerator.Generate(sources.ToImmutableList());
  }

  [HttpGet("")]
  public async Task<PaginatedResponse<RallyingPoint>> List([FromQuery] RallyingPointFilter rallyingPointFilter)
  {
    return await rallyingPointService.List(rallyingPointFilter);
  }

  [HttpGet("snap")]
  public async Task<RallyingPoint?> Snap([FromQuery] double lat, [FromQuery] double lng)
  {
    return await rallyingPointService.Snap(new(lat, lng), IRallyingPointService.MaxRadius);
  }

  [HttpGet("export")]
  [RequiresAdminAuth]
  public async Task ExportCsv([FromQuery] RallyingPointFilter rallyingPointFilter)
  {
    HttpContext.Response.Headers.Add("Content-Disposition", "attachment; filename=rallying_point.csv");
    HttpContext.Response.Headers.Add("Content-Type", "text/csv");
    await rallyingPointService.ExportCsv(HttpContext.Response.Body, rallyingPointFilter);
  }

  [HttpPost("import")]
  [RequiresAdminAuth]
  public async Task ImportCsv(IFormFile file)
  {
    if (file.ContentType != "text/csv")
    {
      throw new BadHttpRequestException("Must be csv file");
    }

    await using var input = file.OpenReadStream();
    await rallyingPointService.ImportCsv(input);
  }

  [HttpGet("request/all")]
  [RequiresAdminAuth]
  public Task<PaginatedResponse<RallyingPointRequest>> ListAllRequests(Pagination pagination)
  {
    return rallyingPointRequestService.Paginate(pagination);
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

  [HttpPatch("request/{id}")]
  [RequiresAdminAuth]
  public Task<RallyingPointRequest> UpdateRequestStatus([FromRoute] string id, [FromBody] RallyingPointRequestStatus status)
  {
    return rallyingPointRequestService.UpdateRequestStatus(id, status with { By = currentContext.CurrentUser().Id });
  }
}