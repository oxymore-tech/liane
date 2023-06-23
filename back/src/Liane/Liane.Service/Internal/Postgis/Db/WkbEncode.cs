using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using GeoJSON.Text;
using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db;

public static class WkbEncode
{
  private const byte WKbndr = 1;

  public static byte[] Encode(IGeometryObject geometryObject)
  {
    using (var output = new MemoryStream())
    {
      using (var binaryWriter = new BinaryWriter(output))
      {
        Encode(binaryWriter, geometryObject);
        var length = (int)output.Length;
        binaryWriter.Close();
        var buffer = output.GetBuffer();
        Array.Resize(ref buffer, length);
        output.Close();
        return buffer;
      }
    }
  }

  public static byte[] Encode(GeoJSON.Text.Feature.Feature feature) => Encode(feature.Geometry);

  private static void Point(BinaryWriter binaryWriter, IGeometryObject geometryObject)
  {
    var point = geometryObject as Point;
    var num = 1;
    var flag = HasAltitude(point);
    if (flag)
      num += 1000;
    binaryWriter.Write(WKbndr);
    binaryWriter.Write(num);
    var coordinates = point.Coordinates as Position;
    binaryWriter.Write(coordinates.Longitude);
    binaryWriter.Write(coordinates.Latitude);
    if (!flag)
      return;
    binaryWriter.Write(coordinates.Altitude.Value);
  }

  private static void MultiPoint(BinaryWriter binaryWriter, IGeometryObject geometryObject)
  {
    var multiPoint = geometryObject as MultiPoint;
    var num = 4;
    if (HasAltitude(multiPoint))
      num += 1000;
    binaryWriter.Write(WKbndr);
    binaryWriter.Write(num);
    binaryWriter.Write(multiPoint.Coordinates.Count);
    foreach (var coordinate in multiPoint.Coordinates)
      Point(binaryWriter, coordinate);
  }

  private static void Pointold(BinaryWriter binaryWriter, Position position)
  {
    binaryWriter.Write(WKbndr);
    binaryWriter.Write(1);
    binaryWriter.Write(position.Longitude);
    binaryWriter.Write(position.Latitude);
  }

  private static void Points(
    BinaryWriter binaryWriter,
    List<IPosition> positions,
    bool hasAltitude)
  {
    foreach (var position1 in positions)
    {
      var position2 = position1 as Position;
      binaryWriter.Write(position2.Longitude);
      binaryWriter.Write(position2.Latitude);
      if (hasAltitude)
        binaryWriter.Write(position2.Altitude.Value);
    }
  }

  private static void Polyline(BinaryWriter binaryWriter, IGeometryObject geometryObject)
  {
    var lineString = geometryObject as LineString;
    var num = 2;
    var hasAltitude = HasAltitude(lineString);
    if (hasAltitude)
      num += 1000;
    binaryWriter.Write(WKbndr);
    binaryWriter.Write(num);
    binaryWriter.Write(lineString.Coordinates.Count);
    Points(binaryWriter, lineString.Coordinates.ToList<IPosition>(), hasAltitude);
  }

  private static void MultiPolyline(BinaryWriter binaryWriter, IGeometryObject geometryObject)
  {
    var multiLineString = geometryObject as MultiLineString;
    var num = 5;
    if (HasAltitude(multiLineString))
      num += 1000;
    binaryWriter.Write(WKbndr);
    binaryWriter.Write(num);
    binaryWriter.Write(multiLineString.Coordinates.Count);
    foreach (var coordinate in multiLineString.Coordinates)
      Polyline(binaryWriter, coordinate);
  }

  private static void Polygon(BinaryWriter binaryWriter, IGeometryObject geometryObject)
  {
    var polygon = geometryObject as Polygon;
    var num = 3;
    var hasAltitude = HasAltitude(polygon);
    if (hasAltitude)
      num += 1000;
    binaryWriter.Write(WKbndr);
    binaryWriter.Write(num);
    var count = polygon.Coordinates.Count;
    binaryWriter.Write(count);
    foreach (var coordinate in polygon.Coordinates)
    {
      binaryWriter.Write(coordinate.Coordinates.Count);
      Points(binaryWriter, coordinate.Coordinates.ToList<IPosition>(), hasAltitude);
    }
  }

  private static void MultiPolygon(BinaryWriter binaryWriter, IGeometryObject geometryObject)
  {
    var multiPolygon = geometryObject as MultiPolygon;
    var num = 6;
    if (HasAltitude(multiPolygon))
      num += 1000;
    binaryWriter.Write(WKbndr);
    binaryWriter.Write(num);
    binaryWriter.Write(multiPolygon.Coordinates.Count);
    foreach (var coordinate in multiPolygon.Coordinates)
      Polygon(binaryWriter, coordinate);
  }

  private static void GeometryCollection(
    BinaryWriter binaryWriter,
    IGeometryObject geometryObject)
  {
    var geometryCollection = geometryObject as GeometryCollection;
    var num = 7;
    if (HasAltitude(geometryCollection))
      num += 1000;
    binaryWriter.Write(WKbndr);
    binaryWriter.Write(num);
    binaryWriter.Write(geometryCollection.Geometries.Count);
    foreach (var geometry in geometryCollection.Geometries)
      Encode(binaryWriter, geometry);
  }

  private static void Encode(BinaryWriter binaryWriter, IGeometryObject geometryObject)
  {
    switch (geometryObject.Type)
    {
      case GeoJSONObjectType.Point:
        Point(binaryWriter, geometryObject);
        break;
      case GeoJSONObjectType.MultiPoint:
        MultiPoint(binaryWriter, geometryObject);
        break;
      case GeoJSONObjectType.LineString:
        Polyline(binaryWriter, geometryObject);
        break;
      case GeoJSONObjectType.MultiLineString:
        MultiPolyline(binaryWriter, geometryObject);
        break;
      case GeoJSONObjectType.Polygon:
        Polygon(binaryWriter, geometryObject);
        break;
      case GeoJSONObjectType.MultiPolygon:
        MultiPolygon(binaryWriter, geometryObject);
        break;
      case GeoJSONObjectType.GeometryCollection:
        GeometryCollection(binaryWriter, geometryObject);
        break;
    }
  }

  private static bool HasAltitude(Point point) => point.Coordinates.Altitude.HasValue;

  private static bool HasAltitude(MultiPoint multiPoint)
  {
    var point = multiPoint.Coordinates.FirstOrDefault<Point>();
    return (object)point != null && point.Coordinates.Altitude.HasValue;
  }

  private static bool HasAltitude(Polygon polygon)
  {
    var lineString = polygon.Coordinates.FirstOrDefault<LineString>();
    if ((object)lineString == null)
      return false;
    var position = lineString.Coordinates.FirstOrDefault<IPosition>();
    return position != null && position.Altitude.HasValue;
  }

  private static bool HasAltitude(MultiPolygon multiPolygon)
  {
    var polygon = multiPolygon.Coordinates.FirstOrDefault<Polygon>();
    if ((object)polygon == null)
      return false;
    var lineString = polygon.Coordinates.FirstOrDefault<LineString>();
    if ((object)lineString == null)
      return false;
    var position = lineString.Coordinates.FirstOrDefault<IPosition>();
    return position != null && position.Altitude.HasValue;
  }

  private static bool HasAltitude(LineString lineString)
  {
    var position = lineString.Coordinates.FirstOrDefault<IPosition>();
    return position != null && position.Altitude.HasValue;
  }

  private static bool HasAltitude(MultiLineString multiLineString)
  {
    var lineString = multiLineString.Coordinates.FirstOrDefault<LineString>();
    if ((object)lineString == null)
      return false;
    var position = lineString.Coordinates.FirstOrDefault<IPosition>();
    return position != null && position.Altitude.HasValue;
  }

  private static bool HasAltitude(GeometryCollection geometryCollection)
  {
    if (geometryCollection.Geometries.Count == 0)
      return false;
    var geometryObject = geometryCollection.Geometries.First<IGeometryObject>();
    switch (geometryObject.Type)
    {
      case GeoJSONObjectType.Point:
        return HasAltitude(geometryObject as Point);
      case GeoJSONObjectType.MultiPoint:
        return HasAltitude(geometryObject as MultiPoint);
      case GeoJSONObjectType.LineString:
        return HasAltitude(geometryObject as LineString);
      case GeoJSONObjectType.MultiLineString:
        return HasAltitude(geometryObject as MultiLineString);
      case GeoJSONObjectType.Polygon:
        return HasAltitude(geometryObject as Polygon);
      case GeoJSONObjectType.MultiPolygon:
        return HasAltitude(geometryObject as MultiPolygon);
      default:
        throw new Exception("Unsupported type");
    }
  }
}