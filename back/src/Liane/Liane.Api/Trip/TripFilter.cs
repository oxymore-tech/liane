using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed record TripFilter(
    LatLng Center,
    RallyingPoints.RallyingPoint? From,
    RallyingPoints.RallyingPoint? To,
    int? dayFrom,
    int? dayTo,
    int? hourFrom,
    int? hourTo
);