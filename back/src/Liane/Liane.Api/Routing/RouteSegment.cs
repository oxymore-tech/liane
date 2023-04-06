using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Routing;

public struct RouteSegment
{
  public readonly Ref<RallyingPoint> From;
  public readonly Ref<RallyingPoint> To;

  private RouteSegment(Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    From = from;
    To = to;
  }

  public static implicit operator RouteSegment((Ref<RallyingPoint>, Ref<RallyingPoint>) tuple)
  {
    return new RouteSegment(tuple.Item1, tuple.Item2);
  }
}