using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record JoinLianeRequest(
  string? Id,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  Ref<Liane> TargetLiane,
  Ref<User.User>? CreatedBy,
  DateTime? CreatedAt,
  int Seats,
  bool TakeReturnTrip,
  string Message,
  bool? Accepted
) : IEntity;

public sealed record JoinLianeRequestDetailed(
  string Id,
  RallyingPoint From,
  RallyingPoint To,
  Liane TargetLiane,
  User.User CreatedBy,
  DateTime? CreatedAt,
  int Seats,
  bool TakeReturnTrip,
  string Message,
  bool? Accepted,
  Match Match,
  ImmutableSortedSet<WayPoint> WayPoints
  );