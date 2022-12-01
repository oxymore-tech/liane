using Liane.Api.Trip;

namespace Liane.Service.Internal.Match;

internal sealed record ProcessedTripIntent(
    TripIntent TripIntent,
    Api.RallyingPoint.RallyingPoint P1,
    Api.RallyingPoint.RallyingPoint P2
);