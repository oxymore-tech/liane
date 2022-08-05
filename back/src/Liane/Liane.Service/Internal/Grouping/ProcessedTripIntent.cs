using Liane.Service.Internal.RallyingPoints;
using Liane.Service.Internal.Trip;

namespace Liane.Service.Internal.Grouping;

public sealed record ProcessedTripIntent(
    DbTripIntent TripIntent,
    DbRallyingPoint P1,
    DbRallyingPoint P2
);