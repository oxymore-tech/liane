using System;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

[Union]
public abstract record Match
{
  private Match()
  {
  }

  public abstract Ref<RallyingPoint> Pickup { get; init; }
  public abstract Ref<RallyingPoint> Deposit { get; init; }

  public sealed record Exact(Ref<RallyingPoint> Pickup, Ref<RallyingPoint> Deposit) : Match;

  public sealed record Compatible(Delta Delta, Ref<RallyingPoint> Pickup, Ref<RallyingPoint> Deposit, ImmutableList<WayPoint> WayPoints) : Match;
}

public sealed record Delta(int TotalInSeconds, int TotalInMeters, int PickupInSeconds = 0, int PickupInMeters = 0, int DepositInSeconds = 0, int DepositInMeters = 0);

public sealed record LianeMatch(
  Trip Trip,
  int FreeSeatsCount,
  DateTime? ReturnTime,
  Match Match
)
{
  public WayPoint PickupWayPoint => Match switch
  {
    Match.Exact e => Trip.WayPoints.First(w => w.RallyingPoint.Id == e.Pickup.Id),
    Match.Compatible c => c.WayPoints.First(w => w.RallyingPoint.Id == c.Pickup.Id),
    _ => throw new ArgumentOutOfRangeException(nameof(Match))
  };

  public WayPoint DepositWayPoint => Match switch
  {
    Match.Exact e => Trip.WayPoints.First(w => w.RallyingPoint.Id == e.Deposit.Id),
    Match.Compatible c => c.WayPoints.First(w => w.RallyingPoint.Id == c.Deposit.Id),
    _ => throw new ArgumentOutOfRangeException(nameof(Match))
  };

  public DateTime DepartureTime => PickupWayPoint.Eta;
}