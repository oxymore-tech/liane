using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Dapper;
using GeoJSON.Net.Geometry;
using Liane.Api.Routing;
using Npgsql;
using NpgsqlTypes;

namespace Liane.Service.Internal.Postgis.Db.Handler;

public sealed class LatLngEnumerableTypeHandler(Func<IEnumerable<LatLng>, object> collect) : SqlMapper.ITypeHandler
{
  public void SetValue(IDbDataParameter parameter, object? value)
  {
    var v = value as IEnumerable<LatLng>;
    // ReSharper disable once BitwiseOperatorOnEnumWithoutFlags
    ((NpgsqlParameter)parameter).NpgsqlDbType = NpgsqlDbType.Array | NpgsqlDbType.Geometry;
    parameter.Value = v is null ? DBNull.Value : v.Select(vp => new Point(new Position(vp.Lat, vp.Lng, 4326))).ToArray();
  }

  public object Parse(Type destinationType, object value)
  {
    return value switch
    {
      IEnumerable<Point> array => collect(array.Select(p => new LatLng(p.Coordinates.Latitude, p.Coordinates.Longitude))),
      _ => throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}")
    };
  }
}