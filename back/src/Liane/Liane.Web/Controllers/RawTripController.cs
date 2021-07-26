using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/raw")]
    [ApiController]
    [RequiresAuth]
    public class RawTripController : ControllerBase
    {
        private readonly IRawTripService rawTripService;

        public RawTripController(IRawTripService rawTripService)
        {
            this.rawTripService = rawTripService;
        }
        
        [HttpGet("all")]
        [RequiresAdminAuth]
        public Task<ImmutableList<RawTrip>> ListAll()
        {
            return rawTripService.ListAll();
        }
        
        [HttpPost("snap")]
        [RequiresAdminAuth]
        public Task<ImmutableList<RawTrip>> Snap(RawTripFilter rawTripFilter)
        {
            return rawTripService.Snap(rawTripFilter);
        }
        
        [Route("stats")]
        [RequiresAdminAuth]
        public async Task<RawTripStats> Stats()
        {
            return await rawTripService.Stats();
        }
        
    }
}