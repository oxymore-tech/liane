using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Display;
using Liane.Api.Trip;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api")]
    [ApiController]
    [RequiresAuth]
    public sealed class DisplayController : ControllerBase
    {
        private readonly IDisplayService displayService;
        private readonly IRealTripService realTripService;

        public DisplayController(IDisplayService displayService, IRealTripService realTripService)
        {
            this.displayService = displayService;
            this.realTripService = realTripService;
        }

        [HttpGet("trip")]
        public async Task<ImmutableHashSet<RealTrip>> ListTrip()
        {
            return await realTripService.List();
        }

        [HttpPost("stat")]
        [DisableAuth]
        public async Task<ImmutableDictionary<string, RouteStat>> GetStat([FromBody] ImmutableHashSet<Trip> trips, [FromQuery] DayOfWeek? day, [FromQuery] int? startHour, [FromQuery] int? endHour)
        {
            return await displayService.GetStat(trips, day, startHour, endHour);
        }

        [HttpPost("step")]
        [DisableAuth]
        public ImmutableHashSet<RallyingPoint> ListStepsFrom([FromBody] ImmutableHashSet<Trip> trips)
        {
            return displayService.ListStepsFrom(trips);
        }
    }
}