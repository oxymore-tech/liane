using System.Collections.Generic;
using Liane.Api.RallyingPoints;
using Liane.Api.Trip;

namespace Liane.Api.Grouping;

public sealed record MatchedTripIntent(
    TripIntent TripIntent,
    RallyingPoint P1,
    RallyingPoint P2,
    List<string> Members
);