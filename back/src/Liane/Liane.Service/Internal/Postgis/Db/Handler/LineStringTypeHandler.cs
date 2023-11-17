using System;
using System.Data;
using System.Linq;
using Dapper;
using GeoJSON.Text.Geometry;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class LineStringTypeHandler : SqlMapper.TypeHandler<LineString>
{
  public override void SetValue(IDbDataParameter parameter, LineString? value)
  {
    if (value is null)
    {
      parameter.Value = DBNull.Value;
      return;
    }

    parameter.Value = new GeoJSON.Net.Geometry.LineString(value.Coordinates.Select(c => c.ToGeoJsonNet()));
  }

  public override LineString Parse(object value)
  {
    if (value is GeoJSON.Net.Geometry.LineString lineString)
    {
      return new LineString(lineString.Coordinates.Select(c => c.ToGeoJsonText()));
    }

    throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}");
  }
}