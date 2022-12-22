using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record Liane(
    string Id,
    DateTime DepartureTime,
    DateTime? ReturnTime,
    ImmutableList<WayPoint> WayPoints,
    Ref<User.User>? Driver
);

