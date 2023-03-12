using System;
using System.Collections.Immutable;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record LianeMember(
  Ref<User.User> User,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  bool? TakesReturnTrip = null,
  int SeatCount = -1 // Defaults to a passenger seat
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
  Ref<ConversationGroup>? Group = null
) : IEntity, ISharedResource<LianeMember>;