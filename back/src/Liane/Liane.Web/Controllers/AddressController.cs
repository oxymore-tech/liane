using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Address;
using Liane.Api.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers
{
    [Route("api/address")]
    [ApiController]
    public class AddressController : ControllerBase
    {
        private readonly IAddressService addressService;

        public AddressController(IAddressService addressService)
        {
            this.addressService = addressService;
        }

        [HttpGet("displayName")]
        public async Task<ActionResult<AddressResponse>> GetDisplayName([FromQuery] double lat, [FromQuery] double lng)
        {
            return await addressService.GetDisplayName(new LatLng(lat, lng));
        }

        [HttpGet("coordinate")]
        public async Task<ActionResult<AddressResponse>> GetCoordinate([FromQuery] string displayName)
        {
            return await addressService.GetCoordinate(displayName);
        }

        [HttpGet("search")]
        public async Task<ActionResult<ImmutableList<AddressResponse>>> Search([FromQuery] string displayName)
        {
            return await addressService.Search(displayName);
        }
    }
}