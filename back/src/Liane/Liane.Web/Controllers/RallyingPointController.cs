using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Rp;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/rallyingPoint")]
    [ApiController]
    public sealed class RallyingPointController : ControllerBase
    {
        private readonly IRallyingPointService2 rallyingPointService2;

        public RallyingPointController(IRallyingPointService2 rallyingPointService2)
        {
            this.rallyingPointService2 = rallyingPointService2;
        }

        [HttpGet("snap")]
        public async Task<ImmutableList<RallyingPoint2>> Snap([FromQuery] double lat, [FromQuery] double lng)
        {
            return await rallyingPointService2.List(new LatLng(lat, lng));
        }

        [HttpPost("generate")]
        public async Task Generate()
        {
            await rallyingPointService2.LoadFile();
        }
    }
}