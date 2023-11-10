using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip;

public sealed record MemberLocationSample
(
  DateTime At, int NextPointIndex, TimeSpan Delay, LatLng? Coordinate, LatLng? RawCoordinate, double PointDistance, Ref<Api.User.User> member
);

public sealed record LianeTrackReport(
  string Id,
  ImmutableList<MemberLocationSample> MemberLocations,
  DateTime StartedAt,
  DateTime? FinishedAt = null
): IIdentity;