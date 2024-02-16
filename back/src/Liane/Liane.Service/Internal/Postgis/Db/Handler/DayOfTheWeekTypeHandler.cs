using System;
using System.Data;
using Dapper;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class DayOfTheWeekTypeHandler : SqlMapper.TypeHandler<DayOfWeekFlag>
{
  public override void SetValue(IDbDataParameter parameter, DayOfWeekFlag value)
  {
    parameter.DbType = DbType.String;
    parameter.Value = value.PrintToString().ToCharArray();
  }

  public override DayOfWeekFlag Parse(object value)
  {
    return value switch
    {
      string s => DayOfWeekFlagUtils.FromString(s),
      _ => throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}")
    };
  }
}