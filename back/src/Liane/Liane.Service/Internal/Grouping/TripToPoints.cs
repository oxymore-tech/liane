using System.Collections.Generic;
using Liane.Api.RallyingPoints;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Grouping;

public sealed record TripToPoints(
    TripIntent Trip,
    Dictionary<RallyingPoint, RallyingPoint> UsedSegments
);