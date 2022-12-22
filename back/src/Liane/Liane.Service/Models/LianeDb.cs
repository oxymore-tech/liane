using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;

namespace Liane.Service.Models;

public sealed record LianeMember(
    Ref<User> User,
    Ref<RallyingPoint> From, 
    Ref<RallyingPoint> To
);
public sealed record LianeDb(
    string Id,
    Ref<User>? CreatedBy,
    DateTime? CreatedAt,
    DateTime DepartureTime,
    DateTime? ReturnTime,
    ImmutableList<LianeMember> Members,
    Ref<User> Driver //TODO capacity
): IEntity;