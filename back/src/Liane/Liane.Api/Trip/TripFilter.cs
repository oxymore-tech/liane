using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed record TripFilter(
    LatLng Center,
    RallyingPoint.RallyingPoint? From,
    RallyingPoint.RallyingPoint? To,
    int? DayFrom,
    int? DayTo,
    int? HourFrom,
    int? HourTo
);