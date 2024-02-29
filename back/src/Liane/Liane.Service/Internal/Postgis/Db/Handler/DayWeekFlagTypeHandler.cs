using System;
using System.Data;
using Dapper;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class DayOfWeekFlagTypeHandler : SqlMapper.TypeHandler<DayOfWeekFlag>
{
  public override void SetValue(IDbDataParameter parameter, DayOfWeekFlag value)
  {
    parameter.DbType = DbType.String;
    parameter.Value = value.ToString().ToCharArray(0, 7);
  }

  public override DayOfWeekFlag Parse(object value)
  {
    return value switch
    {
      string s => DayOfWeekFlag.Parse(s),
      _ => throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}")
    };
  }
}