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

  public sealed record Compatible(int DeltaInSeconds) : Match;
}

public sealed record LianeMatch(
  Liane Liane,
  ImmutableSortedSet<WayPoint> WayPoints,
  int FreeSeatsCount,
  Match Match
);