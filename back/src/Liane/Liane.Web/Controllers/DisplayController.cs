using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;

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

        [HttpPost("searchtrip")]
        public async Task<ImmutableList<Api.Trip.Trip>> ListTripsFrom([FromBody] JObject data)
        {
            string[] days = {"Sunday","Monday", "Tuesday", "Wednesday","Thursday","Friday","Saturday"};
            RallyingPoint departure = data["departure"].ToObject<RallyingPoint>();
            RallyingPoint arrival = data["arrival"].ToObject<RallyingPoint>();
            int day = data["day"].ToObject<int>();
            int hour1 = data["hour1"].ToObject<int>();
            return await displayService.SearchTrip(departure, arrival, days[day], hour1);
        }

        [HttpPost("listedges")]
        public async Task<Dictionary<string, ImmutableList<LatLng>>> ListRoutesEdgesFrom([FromBody]  ImmutableHashSet<Trip> trips)
        {
            return await displayService.ListRoutesEdgesFrom(trips);
        }

        [HttpPost("liststeps")]
        public ImmutableHashSet<RallyingPoint> ListStepsFrom([FromBody]  ImmutableHashSet<Trip> trips)
        {
            return displayService.ListStepsFrom(trips);
        }
    }
}