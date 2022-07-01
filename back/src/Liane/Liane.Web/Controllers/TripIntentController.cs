using System;
using System.Collections.Immutable;
using System.Globalization;
using System.Threading.Tasks;
using Liane.Api.RallyingPoint;
using Liane.Api.TripIntent;
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
        var ti = new TripIntent(null, tripIntent.from, tripIntent.to,
            DateTime.Parse(tripIntent.fromTime, null, DateTimeStyles.RoundtripKind),
            tripIntent.toTime is null ? null : DateTime.Parse(tripIntent.toTime, null, DateTimeStyles.RoundtripKind)
            );
        
        return await tripIntentService.Create(ti);
    }
    
    [HttpDelete("{id}")]
    public async Task Delete([FromQuery] string id)
    {
        await tripIntentService.Delete(id);
    }

    [HttpGet("")]
    public async Task<ImmutableList<TripIntent>> List()
    {
        return await tripIntentService.List();
    }
    
    public sealed record ReceivedTripIntent(
        string? Id, 
        RallyingPoint from, 
        RallyingPoint to, 
        string fromTime,
        string? toTime 
    );
}

