using System;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeRequest(
  Guid? Id,
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  bool RoundTrip,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  ImmutableList<TimeConstraint> TimeConstraints,
  bool IsEnabled,
  Ref<User>? CreatedBy,
  DateTime? CreatedAt
) : IEntity<Guid?>
{
  public TimeRange When => TimeConstraints.Select(tc => tc.When).FirstOrDefault();
}

public sealed record TimeConstraint(TimeRange When, Ref<RallyingPoint> At, DayOfWeekFlag WeekDays);

public readonly record struct TimeRange(TimeOnly Start, TimeOnly? End);