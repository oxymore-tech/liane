using Liane.Api.RallyingPoints;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Grouping;

internal sealed record ProcessedTripIntent(
    TripIntent TripIntent,
    RallyingPoint P1,
    RallyingPoint P2
);