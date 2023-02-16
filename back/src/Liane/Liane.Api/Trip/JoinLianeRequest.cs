using System;
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
  string Message
) : IEntity;