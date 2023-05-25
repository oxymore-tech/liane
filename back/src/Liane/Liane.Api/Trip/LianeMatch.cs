using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

[Union]
public abstract record Match
{
  private Match()
  {
  }

  public sealed record Exact(Ref<RallyingPoint> Pickup, Ref<RallyingPoint> Deposit) : Match;

  public sealed record Compatible(Delta Delta, Ref<RallyingPoint> Pickup, Ref<RallyingPoint> Deposit, ImmutableList<WayPoint> WayPoints) : Match;
}

public sealed record Delta(int TotalInSeconds, int TotalInMeters, int PickupInSeconds = 0, int PickupInMeters = 0, int DepositInSeconds = 0, int DepositInMeters = 0);

public sealed record LianeMatch(
  Liane Liane,
  int FreeSeatsCount,
  Match Match
);