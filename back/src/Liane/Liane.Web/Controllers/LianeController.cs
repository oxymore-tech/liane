using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;


[Route("api/liane")]
[ApiController]
[RequiresAuth]
public sealed class LianeController : ControllerBase
{
    
    private readonly ILianeService lianeService;
    
    public LianeController(ILianeService lianeService)
    {
        this.lianeService = lianeService;
    }


    [HttpGet("")]
    public Task<ImmutableList<Api.Trip.Liane>> List()
    {
        return lianeService.List();
    }
    
    [HttpPost("")]
    public Task<Api.Trip.Liane> Create(LianeRequest lianeRequest)
    {
        return lianeService.Create(lianeRequest);
    }
    
    
}