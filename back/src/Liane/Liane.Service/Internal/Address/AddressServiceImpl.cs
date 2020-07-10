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
            
        public async Task<Api.Address.Address> GetDisplayName(LatLng coordinate)
        {
            var response = await nominatimService.AddressSearch(coordinate);
            
            return new Api.Address.Address( response.DisplayName,new LatLng(response.Lat,response.Lng));
        }

        public async Task<Api.Address.Address> GetCoordinate(string displayName)
        {
            var response = await nominatimService.CoordSearch(displayName);
            
            return new Api.Address.Address( response.DisplayName,new LatLng(response.Lat,response.Lng));
        }

    }
}