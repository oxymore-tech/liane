using System;

namespace Liane.Api.Trip;

public sealed record TripIntent (
    string? Id,
    string User,
    RallyingPoints.RallyingPoint From,
    RallyingPoints.RallyingPoint To,
    DateTime FromTime,
    DateTime? ToTime 
);