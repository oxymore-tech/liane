using System.Threading.Tasks;

namespace Liane.Api.Address
{
    public interface IAddressService
    {
        
        Task<Address> GetAddressName(AddressNameQuery addressQuery);
        
        Task<Address> GetAddressCoord(AddressCoordQuery addressQuery);
        
    }
}