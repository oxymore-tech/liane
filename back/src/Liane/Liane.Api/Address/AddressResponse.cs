using Liane.Api.Routing;

namespace Liane.Api.Address;

public sealed record AddressResponse(
    LatLng Coordinate,
    string DisplayName,
    Address Address
);