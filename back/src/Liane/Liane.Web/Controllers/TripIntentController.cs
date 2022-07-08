using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.TripIntent;
using Liane.Api.Trip;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/trip_intent")]
[ApiController]
[RequiresAuth]
public sealed class TripIntentController : ControllerBase
{
    private readonly ITripIntentService tripIntentService;
    
    public TripIntentController(ITripIntentService tripIntentService)
    {
        this.tripIntentService = tripIntentService;
    }
    
    [HttpPost("")]
    public async Task<TripIntent> Create([FromBody] ReceivedTripIntent tripIntent)
    {
        return await tripIntentService.Create(tripIntent);
    }

    [HttpDelete("{id}")]
    public async Task Delete(string id)
    {
        await tripIntentService.Delete(id);
    }

    [HttpGet("")]
    public async Task<ImmutableList<TripIntent>> List()
    {
        return await tripIntentService.List();
    }
}