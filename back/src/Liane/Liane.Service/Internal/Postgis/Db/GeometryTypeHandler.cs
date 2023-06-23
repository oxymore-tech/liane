using System.Data;
using Dapper;
using Wkx;

namespace Liane.Service.Internal.Postgis.Db;

public sealed class GeometryTypeHandler : SqlMapper.TypeHandler<Geometry>
{
  public override void SetValue(IDbDataParameter parameter, Geometry value)
  {
    parameter.DbType = DbType.Binary;
    parameter.Value = value.SerializeByteArray<LineString>();
  }

  public override Geometry Parse(object value)
  {
    return Geometry.Deserialize<WkbSerializer>((byte[])value);
  }
}