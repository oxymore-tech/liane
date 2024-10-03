using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeMatch(
  LianeRequest LianeRequest,
  LianeState State
);

[Union]
public abstract record LianeState
{
  private LianeState()
  {
  }

  public sealed record Detached(ImmutableList<Match> Matches) : LianeState;

  public sealed record Pending(Liane Liane) : LianeState;

  public sealed record Attached(Liane Liane) : LianeState;
}

public sealed record Match(
  Ref<Liane> Liane,
  int TotalMembers,
  ImmutableList<Ref<LianeRequest>> Matches,
  DayOfWeekFlag WeekDays,
  TimeRange When,
  RallyingPoint Pickup,
  RallyingPoint Deposit,
  float Score,
  bool IsReverseDirection
);