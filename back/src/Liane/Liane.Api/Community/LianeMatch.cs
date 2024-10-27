using System;
using System.Collections.Immutable;
using Liane.Api.Auth;
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

  public sealed record Attached(Liane Liane) : LianeState;
}

[Union]
public abstract record JoinRequest
{
  private JoinRequest()
  {
  }

  public sealed record Pending(DateTime At) : JoinRequest;
  public sealed record Received(DateTime At) : JoinRequest;
}

[Union]
public abstract record Match
{
  private Match()
  {
  }

  public abstract Ref<Liane> Liane { get; init; }
  public abstract DayOfWeekFlag WeekDays { get; init; }
  public abstract TimeRange When { get; init; }
  public abstract ImmutableList<User> Members { get; init; }
  public abstract RallyingPoint Pickup { get; init; }
  public abstract RallyingPoint Deposit { get; init; }
  public abstract float Score { get; init; }
  public abstract bool IsReverseDirection { get; init; }

  public sealed record Single(
    Ref<Liane> Liane,
    ImmutableList<User> Members,
    string Name,
    DayOfWeekFlag WeekDays,
    TimeRange When,
    RallyingPoint Pickup,
    RallyingPoint Deposit,
    float Score,
    bool IsReverseDirection,
    JoinRequest? JoinRequest
  ) : Match;

  public sealed record Group(
    Ref<Liane> Liane,
    ImmutableList<User> Members,
    ImmutableList<Ref<LianeRequest>> Matches,
    DayOfWeekFlag WeekDays,
    TimeRange When,
    RallyingPoint Pickup,
    RallyingPoint Deposit,
    float Score,
    bool IsReverseDirection,
    DateTime? PendingRequest
  ) : Match;
}