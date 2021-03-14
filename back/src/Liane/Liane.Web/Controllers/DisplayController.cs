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
        public async Task<ImmutableHashSet<Api.Trip.Trip>> DefaultSearchTrip([FromBody] JObject data)
        {
            string[] days = {"Sunday","Monday", "Tuesday", "Wednesday","Thursday","Friday","Saturday", "day"};
            RallyingPoint departure = data["departure"].ToObject<RallyingPoint>();
            RallyingPoint arrival = data["arrival"].ToObject<RallyingPoint>();
            int day = 7;
            if (!(data["day"].ToString().Equals("day"))) {
                day = data["day"].ToObject<int>();
            }
            int hour1 = data["hour1"].ToObject<int>();
            int hour2 = data["hour2"].ToObject<int>();
            if (data["departure"] == null) {
                if ( data["arrival"] == null) {
                    return await displayService.DefaultSearchTrip(days[day], hour1, hour2);
                }
                else {
                    return await displayService.DefaultSearchTrip(days[day], hour1, hour2, null, arrival);
                }
            }
            else {
                if ( data["arrival"] == null) {
                    return await displayService.DefaultSearchTrip(days[day], hour1, hour2, departure);
                }
                else {
                    return await displayService.DefaultSearchTrip(days[day], hour1, hour2, departure, arrival);
                }
            }
        }

        [HttpGet("usertrips")]
        public async Task<ImmutableList<RallyingPoint>> ListUserTrips([FromQuery] string user, [FromQuery] string day)
        {
            return await displayService.ListUserTrips(user, day);
        }

        [HttpPost("listedges")]
        public async Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom([FromBody]  ImmutableHashSet<Trip> trips,
                                                                                         [FromQuery] int day = 0,
                                                                                         [FromQuery] int hour1 = 0,
                                                                                         [FromQuery] int hour2 = 24)
        {
            string[] days = {"Sunday","Monday", "Tuesday", "Wednesday","Thursday","Friday","Saturday", "day"};
            return await displayService.ListRoutesEdgesFrom(trips, days[day], hour1, hour2);
        }

        [HttpPost("liststeps")]
        public ImmutableHashSet<RallyingPoint> ListStepsFrom([FromBody]  ImmutableHashSet<Trip> trips)
        {
            return displayService.ListStepsFrom(trips);
        }

    }
}