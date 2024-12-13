using Liane.Api.Util.Geo;
using NetTopologySuite.Geometries;

namespace Liane.Service.Internal.Util.Geo;

public static class BoundingBoxExtensions
{
  public static Polygon AsPolygon(this BoundingBox bbox)
  {
    return new Polygon(new LinearRing([
      new Coordinate(bbox.Min.Lng, bbox.Min.Lat),
      new Coordinate(bbox.Max.Lng, bbox.Min.Lat),
      new Coordinate(bbox.Max.Lng, bbox.Max.Lat),
      new Coordinate(bbox.Min.Lng, bbox.Max.Lat),
      new Coordinate(bbox.Min.Lng, bbox.Min.Lat)
    ])) { SRID = 4326 };
  }
}