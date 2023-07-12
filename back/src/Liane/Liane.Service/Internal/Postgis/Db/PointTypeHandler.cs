using System.Data;
using Dapper;
using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db;

public sealed class PointTypeHandler : SqlMapper.TypeHandler<Point>
{
  public override void SetValue(IDbDataParameter parameter, Point value)
  {
    parameter.DbType = DbType.Binary;
    parameter.Value = WkbEncode.Encode(value);
  }

  public override Point Parse(object value)
  {
    return (Point)WkbDecode.Decode((byte[])value);
  }
}