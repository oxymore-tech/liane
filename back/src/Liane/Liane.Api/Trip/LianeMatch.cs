using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;


public abstract record MatchType(string Type);

public sealed record ExactMatch() : MatchType(nameof(ExactMatch));
public sealed record CompatibleMatch(
  int DeltaInSeconds
) : MatchType(nameof(CompatibleMatch));

public sealed record LianeMatch(
  Ref<Liane> Liane,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  ImmutableSortedSet<WayPoint> WayPoints,
  ImmutableSortedSet<WayPoint> OriginalTrip,
  int FreeSeatsCount,
  Ref<User.User>? Driver,
  MatchType MatchData
);