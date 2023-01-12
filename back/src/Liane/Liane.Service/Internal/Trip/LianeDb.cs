using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip;


public sealed record DriverData
(
    Ref<Api.User.User> User,
    int Capacity
);

public sealed record LianeDb(
    string Id,
    Ref<Api.User.User>? CreatedBy,
    DateTime? CreatedAt,
    DateTime DepartureTime,
    DateTime? ReturnTime,
    ImmutableList<LianeMember> Members,
    DriverData DriverData 
): IEntity;