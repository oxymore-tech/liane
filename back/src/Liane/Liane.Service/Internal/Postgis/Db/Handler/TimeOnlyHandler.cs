using System;
using System.Data;
using Dapper;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class TimeOnlyHandler : SqlMapper.TypeHandler<TimeOnly>
{
  public override TimeOnly Parse(object value) => TimeOnly.FromTimeSpan((TimeSpan)value);

  public override void SetValue(IDbDataParameter parameter, TimeOnly value)
  {
    parameter.DbType = DbType.Time;
    parameter.Value = value.ToTimeSpan();
  }
}