using System;
using System.Collections.Immutable;
using Liane.Api.Util.Ref;

namespace Liane.Api.Liane;

    public sealed record LianeRequest(
        string? Id, 
        DateTime DepartureTime,
        DateTime? ReturnTime,
        int DriverCapacity,
        Ref<RallyingPoint.RallyingPoint> From,
        Ref<RallyingPoint.RallyingPoint> To,
        ImmutableList<Ref<User.User>> ShareWith //TODO phone
    );
