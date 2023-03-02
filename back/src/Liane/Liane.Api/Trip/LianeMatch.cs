using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public abstract record MatchType : IUnion
{
  public sealed record ExactMatch : MatchType;
  public sealed record CompatibleMatch(int DeltaInSeconds) : MatchType;
}



public sealed record LianeMatch(
  Liane Liane, 
  ImmutableSortedSet<WayPoint> WayPoints,
  int FreeSeatsCount,
  MatchType MatchData
);