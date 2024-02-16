using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record Liane(
  string Id,
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  ImmutableList<TimeConstraint> TimeConstraints,
  DateTime? VacationStart,
  DateTime? VacationEnd,
  ImmutableList<Match> Matches,
  Ref<User.User> CreatedBy,
  DateTime? CreatedAt
) : IEntity;

public sealed record TimeConstraint(TimeRange When, Ref<RallyingPoint> At, DayOfWeekFlag WeekDays);

public readonly record struct TimeRange(TimeOnly Start, TimeOnly? End);

public sealed record LianeQuery(
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  ImmutableList<TimeConstraint> TimeConstraints,
  DateTime? VacationStart,
  DateTime? VacationEnd
);

public sealed record Match(
  Ref<Liane> Liane,
  Ref<User.User> User,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  Ref<RallyingPoint> Pickup,
  Ref<RallyingPoint> Deposit,
  float Score
);