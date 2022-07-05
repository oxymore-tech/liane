using System;

namespace Liane.Api.TripIntent;

public sealed record TripIntent (
    string? Id,
    string User,
    RallyingPoint.RallyingPoint From,
    RallyingPoint.RallyingPoint To,
    DateTime FromTime,
    DateTime? ToTime 
);