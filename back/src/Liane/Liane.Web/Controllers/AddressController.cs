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

        public AddressController(IAddressService routingService)
        {
            this.addressService = addressService;
        }

        [HttpGet("address_name")]
        public async Task<ActionResult<Address>> GetDisplayName(LatLng coordinate )
        {
            return await addressService.GetDisplayName(coordinate);
        }
        
        
        [HttpGet("address_coord")]
        public async Task<ActionResult<Address>> GetCoordinate(string displayName)
        {
            return await addressService.GetCoordinate(displayName);
        }
    }
}