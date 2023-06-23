using System.Data;
using Dapper;
using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db;

public sealed class GeoJsonTypeHandler : SqlMapper.TypeHandler<LineString>
{
  public override void SetValue(IDbDataParameter parameter, LineString value)
  {
    parameter.DbType = DbType.Binary;
    parameter.Value = WkbEncode.Encode(value);
  }

  public override LineString Parse(object value)
  {
    return (LineString)WkbDecode.Decode((byte[])value);
  }
}