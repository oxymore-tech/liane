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
        private readonly IAddressService addressService;

        public AddressController(IAddressService addressService)
        {
            this.addressService = addressService;
        }

        [HttpGet("address")]
        public async Task<ActionResult<Address>> GetDisplayName([FromQuery] LatLng coordinate)
        {
            return await addressService.GetDisplayName(coordinate);
        }


        [HttpGet("address")]
        public async Task<ActionResult<Address>> GetCoordinate([FromQuery] string displayName)
        {
            return await addressService.GetCoordinate(displayName);
        }
    }
}