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
)
{
  public override string ToString()
  {
    return Direction switch
    {
      Direction.Departure => $"Starting at {DateTime}",
      _ => $"Arriving at {DateTime}"
    };
  }
}

public sealed record Filter(
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  DepartureOrArrivalTime TargetTime,
  int AvailableSeats = -1, // Passenger
  int? MaxDeltaInSeconds = null,
  int? MaxDeltaInMeters = null
);