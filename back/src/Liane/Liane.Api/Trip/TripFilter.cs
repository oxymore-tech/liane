namespace Liane.Api.Trip;

public sealed class TripFilter
{
  public bool ForCurrentUser { get; init; }

  public TripStatus[]? States { get; init; }
}