using System.Threading.Tasks;
using Liane.Api.Address;
using Liane.Api.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api")]
    [ApiController]
    public class AddressController : ControllerBase
    {
        private readonly IAddressServiceNominatim addressService;

        public AddressController(IAddressServiceNominatim addressService)
        {
            this.addressService = addressService;
        }

        [HttpGet("address/displayName")]
        public async Task<ActionResult<Address>> GetDisplayName([FromQuery] double lat, [FromQuery] double lng)
        {
            return await addressService.GetDisplayName(new LatLng(lat, lng));
        }


        [HttpGet("address/coordinate")]
        public async Task<ActionResult<Address>> GetCoordinate([FromQuery] string displayName)
        {
            return await addressService.GetCoordinate(displayName);
        }
    }
}