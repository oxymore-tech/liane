using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Mock;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Http;
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

  public LianeController(ILianeService lianeService, ICurrentContext currentContext, IMockService mockService, IJoinLianeRequestService joinLianeRequestService)
  {
    this.lianeService = lianeService;
    this.currentContext = currentContext;
    this.mockService = mockService;
    this.joinLianeRequestService = joinLianeRequestService;
  }

  [HttpGet("{id}")]
  [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<Api.Trip.Liane> Get([FromRoute] string id)
  {
    var current = currentContext.CurrentResource<Api.Trip.Liane>();
    return current ?? await lianeService.Get(id);
  }
  
  [HttpPost("{id}/join")]
  public async Task<JoinLianeRequest> Get([FromRoute] string id, [FromBody] JoinLianeRequest request)
  {
    var current = currentContext.CurrentUser();
    if (request.TargetLiane.Id != id) throw new BadHttpRequestException("wrong liane id");
    return await joinLianeRequestService.Create(request, current.Id);
    
  }

  [HttpPost("match")]
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

  [HttpPost("generate")]
  [RequiresAdminAuth]
  public async Task<User> Generate([FromQuery] int count, [FromQuery] double lat, [FromQuery] double lng, [FromQuery] int? radius)
  {
    return await mockService.GenerateLiane(count, new LatLng(lat, lng), radius);
  }
}