using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public enum Direction
{
  Departure,
  Arrival
}

public record DepartureOrArrivalTime(
  DateTime DateTime,
  Direction Direction
);

public sealed record Filter(
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  DepartureOrArrivalTime TargetTime,
  int AvailableSeats = -1 // Passenger
);