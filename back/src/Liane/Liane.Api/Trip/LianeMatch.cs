using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record PickupPoint(int DeltaInSeconds, RallyingPoint Point, ImmutableSortedSet<WayPoint> WayPoints);

[Union]
public abstract record Match
{
  private Match()
  {
  }

  public sealed record Exact() : Match;

  public sealed record Compatible(ImmutableList<PickupPoint> PickupPoints) : Match;
}

public sealed record LianeMatch(
  Liane Liane,
  int FreeSeatsCount,
  Match Match
);