using System;
using System.Data;
using Dapper;
using GeoJSON.Net.Geometry;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class LatLngTypeHandler : SqlMapper.TypeHandler<LatLng>
{
  public override void SetValue(IDbDataParameter parameter, LatLng value)
  {
    parameter.Value = new Point(new Position(value.Lat, value.Lng));
  }

  public override LatLng Parse(object value)
  {
    if (value is Point p)
    {
      return new LatLng(p.Coordinates.Latitude, p.Coordinates.Longitude);
    }

    throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}");
  }
}