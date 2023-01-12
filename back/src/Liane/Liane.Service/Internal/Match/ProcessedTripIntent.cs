using Liane.Api.Trip;

namespace Liane.Service.Internal.Match;

internal sealed record ProcessedTripIntent(
    TripIntent TripIntent,
    RallyingPoint P1,
    RallyingPoint P2
);