using Liane.Api.Routing;

namespace Liane.Api.Address
{
    public sealed record Address(string DisplayName, LatLng Coordinate, string? Icon, AddressDetails AddressDetails);
}