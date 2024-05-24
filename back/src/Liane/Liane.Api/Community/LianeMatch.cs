using System.Collections.Immutable;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeMatch(
  LianeRequest LianeRequest,
  ImmutableList<Match.Group> JoinedLianes,
  ImmutableList<Match> Matches
);

[Union]
public abstract record Match
{
  private Match()
  {
  }

  public abstract string Name { get; init; }
  public abstract DayOfWeekFlag WeekDays { get; init; }
  public abstract TimeRange When { get; init; }
  public abstract RallyingPoint Pickup { get; init; }
  public abstract RallyingPoint Deposit { get; init; }
  public abstract float Score { get; init; }

  public sealed record Single(
    string Name,
    LianeRequest LianeRequest,
    Ref<User> User,
    DayOfWeekFlag WeekDays,
    TimeRange When,
    RallyingPoint Pickup,
    RallyingPoint Deposit,
    float Score
  ) : Match;

  public sealed record Group(
    string Name,
    Liane Liane,
    ImmutableList<Single> Matches,
    DayOfWeekFlag WeekDays,
    TimeRange When,
    RallyingPoint Pickup,
    RallyingPoint Deposit,
    float Score
  ) : Match;
}