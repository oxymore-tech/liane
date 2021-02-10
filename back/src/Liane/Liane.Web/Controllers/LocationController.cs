using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Location;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/location")]
    [ApiController]
    public sealed class LocationController : ControllerBase
    {
        private readonly ILocationService locationService;

        public LocationController(ILocationService locationService)
        {
            this.locationService = locationService;
        }

        [HttpPost("")]
        public async Task LogLocation([FromBody] ImmutableList<UserLocation> userLocations)
        {
            await locationService.LogLocation(userLocations);
        }
    }
}