using System;
using System.Collections.Immutable;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public enum LianeState
{
  NotStarted,
  Started,
  Finished,
  Canceled
}

public sealed record LianeStatus(
  LianeState State,
  ImmutableList<UserPing> Pings
);

public sealed record UserPing(
  Ref<User.User> User,
  DateTime At,
  TimeSpan Delay,
  LatLng? Coordinate
);

public sealed record LianeMember(
  Ref<User.User> User,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  bool? TakesReturnTrip = null,
  int SeatCount = -1 // Defaults to a passenger seat
) : IResourceMember;

public sealed record Driver
(
  Ref<User.User> User,
  bool CanDrive = true
);

public sealed record Liane(
  string Id,
  Ref<User.User> CreatedBy,
  DateTime? CreatedAt,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  ImmutableSortedSet<WayPoint> WayPoints,
  ImmutableList<LianeMember> Members,
  Driver Driver,
  LianeStatus Status,
  Ref<ConversationGroup>? Group
) : IEntity, ISharedResource<LianeMember>;