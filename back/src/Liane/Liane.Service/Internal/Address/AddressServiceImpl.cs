using System.Threading.Tasks;
using Liane.Api.Address;
using Liane.Api.Routing;
using Liane.Service.Internal.Nominatim;

namespace Liane.Service.Internal.Address
{
    public sealed class AddressServiceImpl : IAddressService
    {
        private readonly INominatimService nominatimService;

        public AddressServiceImpl(INominatimService nominatimService)
        {
            this.nominatimService = nominatimService;
        }
            
        public async Task<Api.Address.Address> GetAddressName(AddressNameQuery addressQuery)
        {
            var response = await nominatimService.AddressSearch(addressQuery.Coord);
            
            return new Api.Address.Address( response.DisplayName,new LatLng(response.Lat,response.Lng));
        }

        public async Task<Api.Address.Address> GetAddressCoord(AddressCoordQuery addressQuery)
        {
            var response = await nominatimService.CoordSearch(addressQuery.Address);
            
            return new Api.Address.Address( response.DisplayName,new LatLng(response.Lat,response.Lng));
        }

    }
}