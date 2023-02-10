using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;


[Route("api/liane")]
[ApiController]
[RequiresAuth]
public sealed class LianeController : ControllerBase
{
  private readonly ILianeService lianeService;
  private readonly ICurrentContext currentContext;


public LianeController(ILianeService lianeService, ICurrentContext currentContext)
{
  this.lianeService = lianeService;
  this.currentContext = currentContext;
}

    [HttpGet("{id}")]
    [RequiresAccessLevel(ResourceAccessLevel.Member, typeof(Api.Trip.Liane))]
  public async Task<Api.Trip.Liane> Get([FromRoute] string id)
    {
      var current = currentContext.CurrentResource<Api.Trip.Liane>();
    return current ?? await lianeService.Get(id);
  }

  [HttpPost("")]
  public Task<PaginatedResponse<Api.Trip.Liane, DatetimeCursor>> List([FromBody] Filter filter, Pagination<DatetimeCursor> pagination)
  {
    return lianeService.List(filter, pagination);
  }
  
  [HttpGet("")]
  public Task<PaginatedResponse<Api.Trip.Liane, DatetimeCursor>> List(Pagination<DatetimeCursor> pagination)
    {
    return lianeService.ListForCurrentUser(pagination);
    }
    
    [HttpPost("")]
    public Task<Api.Trip.Liane> Create(LianeRequest lianeRequest)
    {
        return lianeService.Create(lianeRequest, currentContext.CurrentUser().Id);
    }
    
    
}