using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record LianeMember(
    Ref<User.User> User,
    Ref<RallyingPoint> From, 
    Ref<RallyingPoint> To
) : IResourceMember;
public sealed record Liane(
    string Id,
    Ref<User.User> CreatedBy,
    DateTime? CreatedAt,
    DateTime DepartureTime,
    DateTime? ReturnTime,
    ImmutableSortedSet<WayPoint> WayPoints,
    ImmutableList<LianeMember> Members,
    Ref<User.User>? Driver,
    string? GroupId = null
) : IEntity,ISharedResource<LianeMember>;


