using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Trip;

namespace Liane.Api.Event;

public sealed record JoinLianeRequest(
  string Id,
  RallyingPoint From,
  RallyingPoint To,
  Trip.Liane TargetLiane,
  User.User CreatedBy,
  DateTime? CreatedAt,
  int Seats,
  bool TakeReturnTrip,
  string Message,
  bool? Accepted,
  Match Match,
  ImmutableSortedSet<WayPoint> WayPoints
);