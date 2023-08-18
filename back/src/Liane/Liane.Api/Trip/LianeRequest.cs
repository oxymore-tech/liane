using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public record BaseLianeRequest
(
  DateTime DepartureTime,
  DateTime? ReturnTime,
  int AvailableSeats,
  [property:SerializeAsResolvedRef]
  Ref<RallyingPoint> From,
  [property:SerializeAsResolvedRef]
  Ref<RallyingPoint> To
);
public sealed record LianeRequest(
  string? Id,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  int AvailableSeats,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  DayOfTheWeekFlag? Recurrence = null
) : BaseLianeRequest(DepartureTime, ReturnTime, AvailableSeats, From, To) ,IIdentity;
