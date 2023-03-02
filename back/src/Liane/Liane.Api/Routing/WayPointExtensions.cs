using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Routing;

public static class WayPointExtensions
{
  public static IEnumerable<RouteSegment> ToRouteSegments(this IEnumerable<WayPoint> trip)
  {
    Ref<RallyingPoint>? previous = null;
    foreach (var wayPoint in trip)
    {
      if (previous is null)
      {
        previous = wayPoint.RallyingPoint;
      }
      else
      {
        yield return (previous, wayPoint.RallyingPoint);
        previous = null;
      }
    }
  }

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