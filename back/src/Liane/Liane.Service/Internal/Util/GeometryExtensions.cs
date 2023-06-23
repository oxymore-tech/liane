using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Util;

using LngLatTuple = Tuple<double, double>;

public static class GeometryExtensions
{
  public static LineString ToLineString(this IEnumerable<LngLatTuple> coordinates)
  {
    return new LineString(coordinates.Select(c => new Position(c.Item2, c.Item1)));
  }

  public static GeoJsonLineString<GeoJson2DGeographicCoordinates> ToMongoGeoJson(this ImmutableList<LatLng> coordinates)
  {
    var geoJson2DGeographicCoordinatesList = coordinates.Select(c => new GeoJson2DGeographicCoordinates(c.Lng, c.Lat));
    return new GeoJsonLineString<GeoJson2DGeographicCoordinates>(new GeoJsonLineStringCoordinates<GeoJson2DGeographicCoordinates>(geoJson2DGeographicCoordinatesList));
  }

  public static ImmutableList<LatLng> ToLatLng(this GeoJsonLineString<GeoJson2DGeographicCoordinates> lineString)
  {
    return lineString.Coordinates.Positions.Select(c => new LatLng(c.Latitude, c.Longitude))
      .ToImmutableList();
  }

  public static GeoJsonPolygon<GeoJson2DGeographicCoordinates> GetApproxCircle(LatLng center, double radiusInMeters)
  {
    // Calculate the vertices of a regular 8-sided polygon inscribed in the sphere
    const int approx = 8;
    var polygonVertices = new List<GeoJson2DGeographicCoordinates>();
    for (var i = 0; i < approx; i++)
    {
      var angle = Math.PI * 2.0 / approx * i;
      var x = Math.Cos(angle) * radiusInMeters;
      var y = Math.Sin(angle) * radiusInMeters;
      polygonVertices.Add(GeoJson.Geographic(
        center.Lng + x / 111319.9, // Convert meters to degrees
        center.Lat + y / 111319.9 // Convert meters to degrees
      ));
    }

    return PointsToPolygon(polygonVertices);
  }

  public static GeoJsonPolygon<GeoJson2DGeographicCoordinates> GetBoundingBox(LatLng from, LatLng to)
  {
    var boundingBox = GetBoundingBox(ImmutableList.Create(from, to));
    return PointsToPolygon(boundingBox.Select(c => new GeoJson2DGeographicCoordinates(c.Lng, c.Lat)).ToList());
  }

  public static GeoJsonPolygon<GeoJson2DGeographicCoordinates> GetOrientedBoundingBox(ImmutableList<LatLng> coordinates)
  {
    // We consider the lat,lng on a 2d planar geometry.
    // We make the assumption that a good approximation of the main axis is given by the vector (from, to)
    var from = coordinates[0];
    var to = coordinates.Last();
    var angle = Math.Atan2(to.Lat - from.Lat, to.Lng - from.Lng);

    // Get center of points
    var center = new LatLng((to.Lat - from.Lat) / 2, (to.Lng - from.Lng) / 2);

    // Rotate points around the center point by the angle given by our main axis and get their bounding box
    var rotatedPoints = RotateCoordinates(angle, center, coordinates);
    var rotatedBoundingBox = GetBoundingBox(rotatedPoints);

    // Get bounding box in original coordinate system
    var boundingBox = RotateCoordinates(-angle, center, rotatedBoundingBox);

    return PointsToPolygon(boundingBox.Select(c => new GeoJson2DGeographicCoordinates(c.Lng, c.Lat)).ToList());
  }

  /// Clock-wise rectangle corners (from top left corner)
  private static ImmutableList<LatLng> GetBoundingBox(ImmutableList<LatLng> coordinates)
  {
    var boundingBox = coordinates.Aggregate(
      new { MinLng = double.MaxValue, MinLat = double.MaxValue, MaxLng = double.MinValue, MaxLat = double.MinValue },
      (acc, c) => new
      {
        MinLng = Math.Min(acc.MinLng, c.Lng),
        MinLat = Math.Min(acc.MinLat, c.Lat),
        MaxLng = Math.Max(acc.MaxLng, c.Lng),
        MaxLat = Math.Max(acc.MaxLat, c.Lat)
      });

    return new[]
    {
      new LatLng(boundingBox.MaxLat, boundingBox.MinLng), // top left
      new LatLng(boundingBox.MaxLat, boundingBox.MaxLng), // top right
      new LatLng(boundingBox.MinLat, boundingBox.MaxLng), // bottom right
      new LatLng(boundingBox.MinLat, boundingBox.MinLng), // bottom left
    }.ToImmutableList();
  }

  private static ImmutableList<LatLng> RotateCoordinates(double angle, LatLng center, ImmutableList<LatLng> coordinates)
  {
    return coordinates.Select(c =>
    {
      var dx = c.Lng - center.Lng;
      var dy = c.Lat - center.Lat;
      var newLng = dx * Math.Cos(angle) - dy * Math.Sin(angle) + center.Lng;
      var newLat = dx * Math.Sin(angle) + dy * Math.Cos(angle) + center.Lat;
      return new LatLng(newLat, newLng);
    }).ToImmutableList();
  }

  private static GeoJsonPolygon<GeoJson2DGeographicCoordinates> PointsToPolygon(IList<GeoJson2DGeographicCoordinates> points)
  {
    var polygon = new GeoJsonPolygon<GeoJson2DGeographicCoordinates>(
      new GeoJsonPolygonCoordinates<GeoJson2DGeographicCoordinates>(
        new GeoJsonLinearRingCoordinates<GeoJson2DGeographicCoordinates>
          (points.Append(new GeoJson2DGeographicCoordinates(points[0].Longitude, points[0].Latitude)))));
    return polygon;
  }

  public static bool IsWithin(this LatLng coordinate, LatLng pos, LatLng pos2)
  {
    return coordinate.Lat >= Math.Min(pos.Lat, pos2.Lat) && coordinate.Lat <= Math.Max(pos.Lat, pos2.Lat)
                                                         && coordinate.Lng >= Math.Min(pos.Lng, pos2.Lng) && coordinate.Lng <= Math.Max(pos.Lng, pos2.Lng);
  }
}