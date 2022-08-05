using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed record TripFilter(
    LatLng Center,
    RallyingPoints.RallyingPoint? From,
    RallyingPoints.RallyingPoint? To,
    int? DayFrom,
    int? DayTo,
    int? HourFrom,
    int? HourTo
);