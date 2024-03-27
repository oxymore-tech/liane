namespace Liane.Api.Trip;

public sealed class LianeFilter
{
  public bool ForCurrentUser { get; init; }

  public LianeState[]? States { get; init; }
}