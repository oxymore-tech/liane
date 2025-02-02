using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using GeoJSON.Text.Feature;
using Liane.Api.Routing;
using Liane.Api.Util;

namespace Liane.Api.Trip;

public static class RallyingPointExtensions
{
  public static FeatureCollection ToFeatureCollection(this IEnumerable<RallyingPoint> rallyingPoints)
  {
    return new FeatureCollection(rallyingPoints.Select(r =>
    {
      var location = r.Location.ToGeoJson();
      var f = new Feature(location, r, r.Id);
      var transformedProperties = f.Properties.Keys.Select(key => (key.NormalizeToCamelCase(), f.Properties[key]))
        .ToImmutableDictionary(entry => entry.Item1, entry => entry.Item2);
      return new Feature(location, transformedProperties, f.Id);
    }).ToList());
  }

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