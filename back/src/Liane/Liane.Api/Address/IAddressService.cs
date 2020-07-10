using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Address
{
    public interface IAddressServiceNominatim
    {
        
        Task<Address> GetDisplayName(LatLng coordinate);
        
        Task<Address> GetCoordinate(string displayName);
        
    }
}