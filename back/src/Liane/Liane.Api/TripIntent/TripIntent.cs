using System;

namespace Liane.Api.TripIntent;

public sealed record TripIntent (
    string? Id,
    RallyingPoint.RallyingPoint from,
    RallyingPoint.RallyingPoint to,
    DateTime fromTime,
    DateTime? toTime 
);