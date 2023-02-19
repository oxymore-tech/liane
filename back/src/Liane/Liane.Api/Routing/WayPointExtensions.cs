using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Routing;

public static class WayPointExtensions
{
  public static bool IsWrongDirection(this ImmutableSortedSet<WayPoint> wayPoints, Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    foreach (var wayPoint in wayPoints)
    {
      if (wayPoint.RallyingPoint == from)
      {
        return false;
      }
      if (wayPoint.RallyingPoint == to)
      {
        return true;
      }
    }

    return true;
  }

  public static int TotalDuration(this ImmutableSortedSet<WayPoint> wayPoints) => wayPoints.Aggregate(0, (acc, w) => acc + w.Duration);
}