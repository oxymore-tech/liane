using Liane.Api.RallyingPoints;

namespace Liane.Service.Internal.Grouping;

public sealed record MatchedTripIntent(
    TripToPoints Trip,
    RallyingPoint P1,
    RallyingPoint P2
);