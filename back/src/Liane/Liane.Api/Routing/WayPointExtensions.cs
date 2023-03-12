using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Routing;

public static class WayPointExtensions
{
  /// <summary>
  /// Check if given RouteSegment is included in given trip and in the right direction
  /// </summary>
  /// <param name="trip"></param> the ordered wayPoints of the trip
  /// <param name="segment"></param> the oriented segment to test
  public static bool IncludesSegment(this ImmutableSortedSet<WayPoint> trip, RouteSegment segment)
  {
    bool visitedFromPoint = false;
    foreach (var wayPoint in trip)
    {
      if (wayPoint.RallyingPoint == segment.From)
      {
        visitedFromPoint = true;
      }
      if (wayPoint.RallyingPoint == segment.To)
      {
        // Return True only if we visit segment.To after segment.From
        return visitedFromPoint;
      }
    }
    return false;
  }

  public static int TotalDuration(this ImmutableSortedSet<WayPoint> wayPoints) => wayPoints.Aggregate(0, (acc, w) => acc + w.Duration);
}