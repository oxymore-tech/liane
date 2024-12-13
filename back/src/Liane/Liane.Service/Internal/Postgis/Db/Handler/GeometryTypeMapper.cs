using System;
using System.Data;
using Dapper;
using NetTopologySuite.Geometries;
using Npgsql;
using NpgsqlTypes;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class GeometryTypeMapper<T> : SqlMapper.TypeHandler<T> where T : Geometry
{
  public override void SetValue(IDbDataParameter parameter, T? value)
  {
    if (value is null)
    {
      parameter.Value = DBNull.Value;
      return;
    }

    if (parameter is NpgsqlParameter npgsqlParameter)
    {
      npgsqlParameter.NpgsqlDbType = NpgsqlDbType.Geometry;
      npgsqlParameter.NpgsqlValue = value;
    }
    else
    {
      throw new ArgumentException();
    }
  }

  public override T Parse(object value)
  {
    if (value is T geometry)
    {
      return geometry;
    }

    throw new ArgumentException();
  }
}