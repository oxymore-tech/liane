namespace Liane.Api.Trip;

public sealed class LianeFilter
{
  public bool ForCurrentUser { get; set; }
  
  public LianeState[]? States { get; set; }
}