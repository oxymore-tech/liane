using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record Liane(
  string Id,
  Ref<User.User> CreatedBy,
  DateTime? CreatedAt,
  ImmutableList<LianeMember> Members
) : IEntity, ISharedResource<LianeMember>;

public sealed record LianeMember(
  [property: SerializeAsResolvedRef] Ref<User.User> User,
  DateTime JoinedAt,
  DateTime? LastReadAt = null
) : IResourceMember;

public sealed record LianeRequest(
  string? Id,
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  ImmutableList<TimeConstraint> TimeConstraints,
  DateTime? VacationStart,
  DateTime? VacationEnd,
  Ref<User.User>? CreatedBy,
  DateTime? CreatedAt
) : IEntity;

public sealed record LianeMatch(
  LianeRequest LianeRequest,
  Liane? Liane,
  ImmutableList<Match> Matches
);

public sealed record TimeConstraint(TimeRange When, Ref<RallyingPoint> At, DayOfWeekFlag WeekDays);

public readonly record struct TimeRange(TimeOnly Start, TimeOnly? End);

public sealed record Match(
  Ref<LianeRequest> Liane,
  [property: SerializeAsResolvedRef] Ref<User.User> User,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  Ref<RallyingPoint> Pickup,
  Ref<RallyingPoint> Deposit,
  float Score
);