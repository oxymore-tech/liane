using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Rp;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/rp")]
    [ApiController]
    [RequiresAuth]
    public sealed class RallyingPointController : ControllerBase
    {
        private readonly IRallyingPointService rallyingPointService;

        public RallyingPointController(IRallyingPointService rallyingPointService)
        {
            this.rallyingPointService = rallyingPointService;
        }
        
        [HttpPost("add")]
        [RequiresAdminAuth]
        public async Task Add([FromBody] LatLng pos, [FromRoute] string name)
        {
            await rallyingPointService.Add(pos, name);
        }
        
        [HttpPost("delete")]
        [RequiresAdminAuth]
        public async Task Delete(string id)
        {
            await rallyingPointService.Delete(id);
        }
        
        [HttpPost("move")]
        [RequiresAdminAuth]
        public async Task Move([FromRoute] string id, [FromBody] LatLng pos)
        {
            await rallyingPointService.Move(id, pos);
        }
        
        [HttpPost("state")]
        [RequiresAdminAuth]
        public async Task State([FromRoute] string id, [FromBody] bool isActive)
        {
            await rallyingPointService.ChangeState(id, isActive);
        }
        
        [HttpPost("generate")]
        [RequiresAdminAuth]
        public async Task Generate()
        {
            await rallyingPointService.LoadFile();
        }

        [HttpGet("list")]
        [DisableAuth]
        public async Task<ImmutableList<RallyingPoint>> List([FromQuery] double lat, [FromQuery] double lng)
        {
            return await rallyingPointService.List(new LatLng(lat, lng));
        }
    }
}
