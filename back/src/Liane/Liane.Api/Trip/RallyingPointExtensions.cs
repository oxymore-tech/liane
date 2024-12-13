using System.Collections.Generic;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util;

namespace Liane.Api.Trip;

public static class RallyingPointExtensions
{
  // Snap each point in the list to the closest point in the set
  public static ImmutableDictionary<LatLng, RallyingPoint> SnapToClosestPoints(IEnumerable<LatLng> sourcePoints, IEnumerable<RallyingPoint> targetPoints)
  {
    return sourcePoints.FilterSelect(sourcePoint => FindClosestPoint(sourcePoint, targetPoints))
      .ToImmutableDictionary(e => e.Item1, e => e.Item2);
  }

  // Find the closest point from the targetPoints for a given sourcePoint
  private static (LatLng, RallyingPoint)? FindClosestPoint(LatLng sourcePoint, IEnumerable<RallyingPoint> targetPoints)
  {
    RallyingPoint? closestPoint = null;
    var minDistance = double.MaxValue;

    foreach (var targetPoint in targetPoints)
    {
      var distance = sourcePoint.Distance(targetPoint.Location);
      if (!(distance < minDistance))
      {
        continue;
      }

      minDistance = distance;
      closestPoint = targetPoint;
    }

    if (closestPoint is null)
    {
      return null;
    }

    return (sourcePoint, closestPoint);
  }
}