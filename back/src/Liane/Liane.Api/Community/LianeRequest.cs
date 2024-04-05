using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeRequest(
  string? Id,
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  ImmutableList<TimeConstraint> TimeConstraints,
  bool IsEnabled,
  Ref<Auth.User>? CreatedBy,
  DateTime? CreatedAt
) : IEntity<string>;

public sealed record TimeConstraint(TimeRange When, Ref<RallyingPoint> At, DayOfWeekFlag WeekDays);

public readonly record struct TimeRange(TimeOnly Start, TimeOnly? End);