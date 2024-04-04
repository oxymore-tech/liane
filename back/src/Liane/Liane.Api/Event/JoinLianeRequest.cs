using System;
using Liane.Api.Trip;

namespace Liane.Api.Event;

public sealed record JoinLianeRequest(
  string Id,
  RallyingPoint From,
  RallyingPoint To,
  Trip.Trip TargetTrip,
  Auth.User CreatedBy,
  DateTime? CreatedAt,
  int Seats,
  bool TakeReturnTrip,
  string Message,
  bool? Accepted,
  Match Match
);