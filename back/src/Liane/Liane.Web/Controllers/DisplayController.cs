using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
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

        [HttpGet("listdestinations")]
        public async Task<ImmutableList<RallyingPoint>> ListDestinationsFrom([FromQuery] string id, [FromQuery] double lat, [FromQuery] double lng)
        {
            return await displayService.ListDestinationsFrom(new RallyingPoint(id, new LatLng(lat, lng)));
        }

        [HttpGet("listtrips")]
        public async Task<ImmutableHashSet<Api.Trip.Trip>> ListTripsFrom([FromQuery] string id, [FromQuery] double lat, [FromQuery] double lng)
        {
            return await displayService.ListTripsFrom(new RallyingPoint(id, new LatLng(lat, lng)));
        }

        [HttpGet("listedges")]
        public async Task<Dictionary<string, ImmutableList<LatLng>>> ListRoutesEdgesFrom([FromQuery] Task<ImmutableHashSet<Api.Trip.Trip>> trips)
        {
            return await displayService.ListRoutesEdgesFrom(trips);
        }
    }
}