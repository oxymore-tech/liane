using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Api.Rp;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/rallyingPoint")]
    [ApiController]
    public sealed class RallyingPointController : ControllerBase
    {
        private readonly IRallyingPointService rallyingPointService;

        public RallyingPointController(IRallyingPointService rallyingPointService)
        {
            this.rallyingPointService = rallyingPointService;
        }

        [HttpGet("{id}")]
        public async Task<RallyingPoint> Snap(string id)
        {
            return await rallyingPointService.Get(id);
        }

        [HttpGet("snap")]
        public async Task<RallyingPoint> Snap([FromQuery] double lat, [FromQuery] double lng)
        {
            return await rallyingPointService.Snap(new LatLng(lat, lng));
        }

        [HttpGet("")]
        public async Task<ImmutableList<RallyingPoint>> List([FromQuery] double lat, [FromQuery] double lng)
        {
            return await rallyingPointService.List(new LatLng(lat, lng));
        }
    }
}