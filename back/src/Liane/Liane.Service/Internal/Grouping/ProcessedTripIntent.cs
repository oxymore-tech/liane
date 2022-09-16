using Liane.Api.RallyingPoints;
using Liane.Service.Internal.Trip;

namespace Liane.Service.Internal.Grouping;

internal sealed record ProcessedTripIntent(
    DbTripIntent TripIntent,
    RallyingPoint P1,
    RallyingPoint P2
);