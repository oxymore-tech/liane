using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/display")]
    [ApiController]
    public sealed class DisplayController : ControllerBase
    {
        private readonly IDisplayService displayService;

        public DisplayController(IDisplayService displayService)
        {
            this.displayService = displayService;
        }

        [HttpGet("snap")]
        public async Task<ImmutableList<RallyingPoint>> SnapPosition([FromQuery] double lat, [FromQuery] double lng)
        {
            return await displayService.SnapPosition(new LatLng(lat, lng));
        }

        [HttpGet("destination")]
        public async Task<ImmutableList<RallyingPoint>> ListDestinationsFrom([FromQuery] string id, [FromQuery] double lat, [FromQuery] double lng)
        {
            return await displayService.ListDestinationsFrom(new RallyingPoint(id, new LatLng(lat, lng)));
        }

        [HttpPost("trip")]
        public async Task<ImmutableHashSet<Trip>> SearchTrips([FromBody] SearchQuery query)
        {
            return await displayService.SearchTrips(query);
        }

        [HttpPost("edge")]
        public async Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom([FromBody] ImmutableHashSet<Trip> trips,
            [FromQuery] DayOfWeek day = 0,
            [FromQuery] int from = 0,
            [FromQuery] int to = 24)
        {
            return await displayService.ListRoutesEdgesFrom(trips, day, from, to);
        }

        [HttpPost("step")]
        public ImmutableHashSet<RallyingPoint> ListStepsFrom([FromBody] ImmutableHashSet<Trip> trips)
        {
            return displayService.ListStepsFrom(trips);
        }
    }
}