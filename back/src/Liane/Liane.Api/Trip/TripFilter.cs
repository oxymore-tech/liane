using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed record TripFilter(
    LatLng Center,
    RallyingPoint.RallyingPoint? From,
    RallyingPoint.RallyingPoint? To,
    int? dayFrom,
    int? dayTo,
    int? hourFrom,
    int? hourTo
);