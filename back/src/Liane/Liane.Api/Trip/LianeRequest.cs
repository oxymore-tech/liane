using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record LianeRequest(
  string? Id,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  int DriverCapacity,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To
);
