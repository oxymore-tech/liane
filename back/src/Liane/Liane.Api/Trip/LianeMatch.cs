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

  public sealed record Exact : Match;

  public sealed record Compatible(int DeltaInSeconds, RallyingPoint Pickup, RallyingPoint Deposit, ImmutableSortedSet<WayPoint> WayPoints) : Match;
}

public sealed record LianeMatch(
  Liane Liane,
  int FreeSeatsCount,
  Match Match
);