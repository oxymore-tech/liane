using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Rp;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/rallyingPoint")]
    [ApiController]
    [RequiresAuth]
    public sealed class RallyingPointController : ControllerBase
    {
        private readonly IRallyingPointService rallyingPointService;

        public RallyingPointController(IRallyingPointService rallyingPointService)
        {
            this.rallyingPointService = rallyingPointService;
        }

        [HttpGet("snap")]
        [DisableAuth]
        public async Task<ImmutableList<RallyingPoint>> Snap([FromQuery] double lat, [FromQuery] double lng)
        {
            return await rallyingPointService.List(new LatLng(lat, lng));
        }

        [HttpPost("generate")]
        [RequiresAdminAuth]
        public async Task Generate()
        {
            await rallyingPointService.LoadFile();
        }
    }
}