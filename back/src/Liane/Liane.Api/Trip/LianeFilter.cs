namespace Liane.Api.Trip;

public sealed class LianeFilter
{
  public bool ForCurrentUser { get; init; }

  public TripStatus[]? States { get; init; }
}