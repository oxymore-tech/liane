using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Address;

public interface IAddressService
{
    Task<AddressResponse> GetDisplayName(LatLng coordinate);

    Task<AddressResponse> GetCoordinate(string displayName);

    Task<ImmutableList<AddressResponse>> Search(string displayName);
}