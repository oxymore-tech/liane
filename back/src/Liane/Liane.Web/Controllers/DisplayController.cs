using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Display;
using Liane.Api.Trip;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api")]
    [ApiController]
    public sealed class DisplayController : ControllerBase
    {
        private readonly IDisplayService displayService;

        public DisplayController(IDisplayService displayService)
        {
            this.displayService = displayService;
        }

        [HttpPost("trip")]
        public async Task<ImmutableHashSet<Trip>> Search([FromBody] SearchQuery query)
        {
            return await displayService.Search(query);
        }

        [HttpPost("route")]
        public async Task<Dictionary<string, RouteStat>> GetRoutes([FromBody] ImmutableHashSet<Trip> trips, [FromQuery] DayOfWeek? day, [FromQuery] int? startHour, [FromQuery] int? endHour)
        {
            return await displayService.GetRoutes(trips, day, startHour, endHour);
        }

        [HttpPost("step")]
        public ImmutableHashSet<RallyingPoint> ListStepsFrom([FromBody] ImmutableHashSet<Trip> trips)
        {
            return displayService.ListStepsFrom(trips);
        }
    }
}