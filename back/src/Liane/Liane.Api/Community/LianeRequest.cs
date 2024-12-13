using System;
using System.Collections.Immutable;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeRequest(
  Guid? Id,
  string Name,
  ImmutableList<Ref<RallyingPoint>> WayPoints,
  bool RoundTrip,
  TimeOnly ArriveBefore,
  TimeOnly ReturnAfter,
  bool CanDrive,
  DayOfWeekFlag WeekDays,
  bool IsEnabled,
  Ref<User>? CreatedBy,
  DateTime? CreatedAt
) : IEntity<Guid?>;

public readonly record struct TimeRange(TimeOnly Start, TimeOnly End)
{
  public TimeRange Merge(TimeRange other) => new(Start < other.Start ? Start : other.Start, End > other.End ? End : other.End);
}