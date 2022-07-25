using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed record Location(
    LatLng Coordinate,
    Address.Address Address
);