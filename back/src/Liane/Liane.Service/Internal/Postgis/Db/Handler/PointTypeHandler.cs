using System.Data;
using Dapper;
using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class PointTypeHandler : SqlMapper.TypeHandler<Point>
{
  public override void SetValue(IDbDataParameter parameter, Point value)
  {
    parameter.DbType = DbType.Binary;
    parameter.Value = WkbEncode.Encode(value);
  }

  public override Point Parse(object value)
  {
    if (value is GeoJSON.Net.Geometry.Point pp)
    {
      return new Point(new Position(pp.Coordinates.Longitude, pp.Coordinates.Latitude));
    }

    return (Point)WkbDecode.Decode((byte[])value);
  }
}