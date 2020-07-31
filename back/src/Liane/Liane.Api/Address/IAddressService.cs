using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Address
{
    public interface IAddressService
    {
        Task<Address> GetDisplayName(LatLng coordinate);

        Task<Address> GetCoordinate(string displayName);

        Task<ImmutableList<Address>> Search(string displayName);
    }
}