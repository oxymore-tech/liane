using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Location;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/location")]
    [ApiController]
    [RequiresAuth]
    public sealed class LocationController : ControllerBase
    {
        private readonly ILocationService locationService;

        public LocationController(ILocationService locationService)
        {
            this.locationService = locationService;
        }

        [HttpPost("log")]
        public async Task LogLocation([FromBody] ImmutableList<UserLocation> userLocations)
        {
            await locationService.LogLocation(userLocations);
        }

        [HttpPost("")]
        public async Task SaveTrip([FromBody] ImmutableList<UserLocation> userLocations)
        {
            await locationService.SaveTrip(userLocations);
        }
    }
}