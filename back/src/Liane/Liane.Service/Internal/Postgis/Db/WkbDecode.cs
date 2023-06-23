using System;
using System.Collections.Generic;
using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db;

public enum WkbGeometryType : uint
{
  Point = 1,
  LineString = 2,
  Polygon = 3,
  MultiPoint = 4,
  MultiLineString = 5,
  MultiPolygon = 6,
  GeometryCollection = 7
}

public static class WkbDecode
{
  private const byte WKbndr = 1;

  public static IGeometryObject Decode(byte[] wkb)
  {
    int wkbPosition = 0;
    return ParseShape(wkb, ref wkbPosition);
  }

  private static Point ParsePoint(byte[] wkb, ref int wkbPosition)
  {
    CheckType(WkbGeometryType.Point, GetType(wkb, ref wkbPosition));
    return new Point(GetGeographicPosition(wkb, ref wkbPosition));
  }

  private static LineString ParseLineString(byte[] wkb, ref int wkbPosition)
  {
    CheckType(WkbGeometryType.LineString, GetType(wkb, ref wkbPosition));
    return new LineString(ParsePositions(wkb, ref wkbPosition));
  }

  private static Polygon ParsePolygon(byte[] wkb, ref int wkbPosition)
  {
    CheckType(WkbGeometryType.Polygon, GetType(wkb, ref wkbPosition));
    uint uint32 = GetUInt32(wkb, ref wkbPosition);
    List<LineString> coordinates = new List<LineString>();
    for (int index = 0; index < uint32; ++index)
    {
      Position[] positions = ParsePositions(wkb, ref wkbPosition);
      coordinates.Add(new LineString(positions));
    }

    return new Polygon(coordinates);
  }

  private static MultiPoint ParseMultiPoint(byte[] wkb, ref int wkbPosition)
  {
    CheckType(WkbGeometryType.MultiPoint, GetType(wkb, ref wkbPosition));
    uint uint32 = GetUInt32(wkb, ref wkbPosition);
    List<Point> coordinates = new List<Point>();
    for (int index = 0; index < uint32; ++index)
      coordinates.Add(ParsePoint(wkb, ref wkbPosition));
    return new MultiPoint(coordinates);
  }

  private static MultiLineString ParseMultiLineString(byte[] wkb, ref int wkbPosition)
  {
    CheckType(WkbGeometryType.MultiLineString, GetType(wkb, ref wkbPosition));
    uint uint32 = GetUInt32(wkb, ref wkbPosition);
    List<LineString> coordinates = new List<LineString>();
    for (int index = 0; index < uint32; ++index)
      coordinates.Add(ParseLineString(wkb, ref wkbPosition));
    return new MultiLineString(coordinates);
  }

  private static MultiPolygon ParseMultiPolygon(byte[] wkb, ref int wkbPosition)
  {
    CheckType(WkbGeometryType.MultiPolygon, GetType(wkb, ref wkbPosition));
    uint uint32 = GetUInt32(wkb, ref wkbPosition);
    List<Polygon> polygonList = new List<Polygon>();
    for (int index = 0; index < uint32; ++index)
      polygonList.Add(ParsePolygon(wkb, ref wkbPosition));
    return new MultiPolygon(polygonList);
  }

  private static GeometryCollection ParseGeometryCollection(byte[] wkb, ref int wkbPosition)
  {
    CheckType(WkbGeometryType.GeometryCollection, GetType(wkb, ref wkbPosition));
    uint uint32 = GetUInt32(wkb, ref wkbPosition);
    List<IGeometryObject> geometries = new List<IGeometryObject>();
    for (int index = 0; index < uint32; ++index)
      geometries.Add(ParseShape(wkb, ref wkbPosition));
    return new GeometryCollection(geometries);
  }

  private static IGeometryObject ParseShape(byte[] wkb, ref int wkbPosition)
  {
    switch (BitConverter.ToUInt32(wkb, wkbPosition + 1))
    {
      case 1:
        return ParsePoint(wkb, ref wkbPosition);
      case 2:
        return ParseLineString(wkb, ref wkbPosition);
      case 3:
        return ParsePolygon(wkb, ref wkbPosition);
      case 4:
        return ParseMultiPoint(wkb, ref wkbPosition);
      case 5:
        return ParseMultiLineString(wkb, ref wkbPosition);
      case 6:
        return ParseMultiPolygon(wkb, ref wkbPosition);
      case 7:
        return ParseGeometryCollection(wkb, ref wkbPosition);
      default:
        throw new Exception("Unsupported type");
    }
  }

  private static uint GetUInt32(byte[] wkb, ref int wkbPosition)
  {
    int uint32 = (int)BitConverter.ToUInt32(wkb, wkbPosition);
    wkbPosition += 4;
    return (uint)uint32;
  }

  private static double GetDouble(byte[] wkb, ref int wkbPosition)
  {
    double num = BitConverter.ToDouble(wkb, wkbPosition);
    wkbPosition += 8;
    return num;
  }

  private static Position[] ParsePositions(byte[] wkb, ref int wkbPosition)
  {
    uint uint32 = GetUInt32(wkb, ref wkbPosition);
    Position[] positions = new Position[(int)uint32];
    for (int index = 0; index < uint32; ++index)
      positions[index] = GetGeographicPosition(wkb, ref wkbPosition);
    return positions;
  }

  private static Position GetGeographicPosition(byte[] wkb, ref int wkbPosition)
  {
    double longitude = GetDouble(wkb, ref wkbPosition);
    return new Position(GetDouble(wkb, ref wkbPosition), longitude);
  }

  private static uint GetType(byte[] wkb, ref int wkbPosition)
  {
    if (wkb[wkbPosition] != WKbndr)
      throw new Exception("Only Little Endian format supported");
    ++wkbPosition;
    return GetUInt32(wkb, ref wkbPosition);
  }

  private static void CheckType(WkbGeometryType expected, uint actual)
  {
    if ((WkbGeometryType)actual != expected)
      throw new ArgumentException($"Invalid wkb geometry type, expected {expected}, actual {actual}");
  }
}