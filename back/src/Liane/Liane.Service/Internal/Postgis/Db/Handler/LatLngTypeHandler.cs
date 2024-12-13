using System;
using System.Data;
using Dapper;
using Liane.Api.Routing;
using NetTopologySuite.Geometries;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class LatLngTypeHandler : SqlMapper.TypeHandler<LatLng>
{
  public override void SetValue(IDbDataParameter parameter, LatLng value)
  {
    parameter.Value = new Point(value.Lng, value.Lat) { SRID = 4326 };
  }

  public override LatLng Parse(object value)
  {
    if (value is Point p)
    {
      return new LatLng(p.Y, p.X);
    }

    throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}");
  }
}