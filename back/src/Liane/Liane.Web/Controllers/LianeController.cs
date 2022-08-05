using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/liane")]
[ApiController]
[RequiresAuth]
public class LianeController : ControllerBase
{
    private readonly ILianeTripService lianeTripService;

    public LianeController(ILianeTripService lianeTripService)
    {
        this.lianeTripService = lianeTripService;
    }

    [HttpPost("snap")]
    [DisableAuth]
    public async Task<ImmutableHashSet<RoutedLiane>> Snap(TripFilter tripFilter)
    {
        return await lianeTripService.Snap(tripFilter);
    }
        
    [HttpGet("get")]
    public async Task<ImmutableHashSet<Api.Trip.Liane>> Get()
    {
        return await lianeTripService.Get();
    }
        
    [HttpPost("generate")]
    [RequiresAdminAuth]
    public async Task Generate()
    {
        await lianeTripService.Generate();
    }
        
    [HttpGet("stats")]
    [RequiresAdminAuth]
    public async Task<LianeStats> Stats()
    {
        return await lianeTripService.Stats();
    }

}