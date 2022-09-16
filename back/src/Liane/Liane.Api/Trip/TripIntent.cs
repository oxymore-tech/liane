using System;

namespace Liane.Api.Trip;

public sealed record TripIntent(
    string? Id,
    string? Title,
    string From,
    string To,
    TimeOnly GoTime,
    TimeOnly? ReturnTime
);