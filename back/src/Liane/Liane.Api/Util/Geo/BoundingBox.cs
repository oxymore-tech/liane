using System;
using System.Collections.Generic;
using Liane.Api.Routing;

namespace Liane.Api.Util.Geo;

public record BoundingBox(LatLng Min, LatLng Max)
{
  public static BoundingBox From(IEnumerable<LatLng> points)
  {
    var minLat = double.MaxValue;
    var minLon = double.MaxValue;
    var maxLat = double.MinValue;
    var maxLon = double.MinValue;

    foreach (var point in points)
    {
      minLat = Math.Min(minLat, point.Lat);
      minLon = Math.Min(minLon, point.Lng);
      maxLat = Math.Max(maxLat, point.Lat);
      maxLon = Math.Max(maxLon, point.Lng);
    }

    return new BoundingBox(new LatLng(minLat, minLon), new LatLng(maxLat, maxLon));
  }

  public BoundingBox Enlarge(double distanceInMeter)
  {
    var distanceKm = distanceInMeter / 1000.0;
    // Convert the distance to degrees latitude (constant)
    var latDiff = distanceKm / 111.32;

    // Convert the distance to degrees longitude (varies with latitude)
    var lonDiffAtMinLat = distanceKm / (111.32 * Math.Cos(ToRadians(Min.Lat)));
    var lonDiffAtMaxLat = distanceKm / (111.32 * Math.Cos(ToRadians(Max.Lat)));

    // Enlarge the bounding box
    var newMinLat = Min.Lat - latDiff;
    var newMaxLat = Max.Lat + latDiff;
    var newMinLon = Min.Lng - lonDiffAtMinLat;
    var newMaxLon = Max.Lng + lonDiffAtMaxLat;

    return new BoundingBox(new LatLng(newMinLat, newMinLon), new LatLng(newMaxLat, newMaxLon));
  }

  private static double ToRadians(double degrees)
  {
    return degrees * (Math.PI / 180.0);
  }
}