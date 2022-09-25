using System;
using Liane.Api.RallyingPoints;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record TripIntent(
    string? Id,
    string? Title,
    Ref<RallyingPoint> From,
    Ref<RallyingPoint> To,
    TimeOnly GoTime,
    TimeOnly? ReturnTime
) : IEntity;