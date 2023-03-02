using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
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
  private readonly IJoinLianeRequestService joinLianeRequestService;

  public LianeController(ILianeService lianeService, ICurrentContext currentContext, IMockService mockService, IJoinLianeRequestService joinLianeRequest)
  {
    this.lianeService = lianeService;
    this.currentContext = currentContext;
    this.mockService = mockService;
    this.joinLianeRequestService = joinLianeRequest;
  }

  [HttpGet("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<Api.Trip.Liane> Get([FromRoute] string id)
  {
    var current = currentContext.CurrentResource<Api.Trip.Liane>();
    return current ?? await lianeService.Get(id);
  }
  
  [HttpPost("{id}/request")]
  [RequiresAccessLevel(ResourceAccessLevel.Any, typeof(Api.Trip.Liane))] // Check resource exits
  public async Task<JoinLianeRequest> Join([FromRoute] string id, [FromBody] JoinLianeRequest request)
  {
    return await joinLianeRequestService.Create(request with {TargetLiane = id}, currentContext.CurrentUser().Id);
  }
  
  [HttpGet("{id}/request")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<PaginatedResponse<JoinLianeRequest>> GetLianeRequests([FromRoute] string id, [FromQuery] Pagination pagination)
  {
    // Get requests linked to a particular Liane
    return await joinLianeRequestService.ListLianeRequests(id, pagination);
  }
  
   
  [HttpGet("request/{id}")]
  public async Task<JoinLianeRequestDetailed> GetDetailedLianeRequest([FromRoute] string id)
  {
    return await joinLianeRequestService.GetDetailedRequest(id);
  }
  
  [HttpPatch("request/{id}")]
  public async Task SetStatus([FromRoute] string id, [FromBody] bool accept)
  {
    var currentUser = currentContext.CurrentUser().Id;
    if (accept) await joinLianeRequestService.AcceptJoinRequest(currentUser, id);
    else await joinLianeRequestService.RefuseJoinRequest(currentUser, id);
  }
  
  [HttpGet("request")]
  public async Task<PaginatedResponse<JoinLianeRequest>> ListUserRequests([FromQuery] Pagination pagination)
  {
    // Get user's requests 
    return await joinLianeRequestService.ListUserRequests(currentContext.CurrentUser().Id, pagination);
  }

  [HttpPost("match")]
  [DebugRequest]
  public Task<PaginatedResponse<LianeMatch>> Match([FromBody] Filter filter, [FromQuery] Pagination pagination)
  {
    return lianeService.Match(filter, pagination);
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