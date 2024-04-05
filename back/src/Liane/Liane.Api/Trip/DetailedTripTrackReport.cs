using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record DetailedTripTrackReport(
  Ref<Trip> Id,
  ImmutableList<WayPoint> WayPoints,
  ImmutableList<TripMember> Members,
  Driver Driver,
  DateTime StartedAt,
  DateTime? FinishedAt = null
);
