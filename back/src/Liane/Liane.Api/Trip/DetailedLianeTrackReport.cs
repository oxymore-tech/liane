using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record DetailedLianeTrackReport(
  Ref<Liane> Id,
  ImmutableList<WayPoint> WayPoints,
  ImmutableList<LianeMember> Members,
  Driver Driver,
  DateTime StartedAt,
  DateTime? FinishedAt = null
);
