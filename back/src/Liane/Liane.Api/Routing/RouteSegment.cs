using Liane.Api.Trip;

namespace Liane.Api.Routing;

public record struct RouteSegment
{
  public readonly RallyingPoint From;
  public readonly RallyingPoint To;

  private RouteSegment(RallyingPoint from, RallyingPoint to)
  {
    From = from;
    To = to;
  }

  public static implicit operator RouteSegment((RallyingPoint, RallyingPoint) tuple)
  {
    return new RouteSegment(tuple.Item1, tuple.Item2);
  }
}