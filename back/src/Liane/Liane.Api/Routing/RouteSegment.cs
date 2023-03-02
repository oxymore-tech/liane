using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Routing;

public record struct RouteSegment(Ref<RallyingPoint> From, Ref<RallyingPoint> To)
{
  public static implicit operator RouteSegment((Ref<RallyingPoint>, Ref<RallyingPoint>) tuple)
  {
    return new RouteSegment(tuple.Item1, tuple.Item2);
  }
}