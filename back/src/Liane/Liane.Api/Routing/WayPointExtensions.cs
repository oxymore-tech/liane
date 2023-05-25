using System.Collections.Generic;
using System.Linq;

namespace Liane.Api.Routing;

public static class WayPointExtensions
{
  /// <summary>
  /// Check if given RouteSegment is included in given trip and in the right direction
  /// </summary>
  /// <param name="trip"></param> the ordered wayPoints of the trip
  /// <param name="segment"></param> the oriented segment to test
  public static bool IncludesSegment(this IEnumerable<WayPoint> trip, RouteSegment segment)
  {
    var visitedFromPoint = false;
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

  public static int TotalDuration(this IEnumerable<WayPoint> wayPoints) => wayPoints.Aggregate(0, (acc, w) => acc + w.Duration);

  public static int TotalDistance(this IEnumerable<WayPoint> wayPoints) => wayPoints.Aggregate(0, (acc, w) => acc + w.Distance);
}