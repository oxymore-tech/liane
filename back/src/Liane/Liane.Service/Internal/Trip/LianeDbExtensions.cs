using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Trip;

public static class LianeDbExtensions
{
  public static ImmutableList<WayPointDb> ToDb(this IEnumerable<WayPoint> wayPoints)
  {
    return wayPoints.Select(w => new WayPointDb(w.RallyingPoint, w.Duration, w.Distance, w.Eta)).ToImmutableList();
  }
}