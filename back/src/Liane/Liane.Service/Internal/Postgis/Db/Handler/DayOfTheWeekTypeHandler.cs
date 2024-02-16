using System;
using System.Data;
using Dapper;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class DayOfTheWeekTypeHandler : SqlMapper.TypeHandler<DayOfTheWeekFlag>
{
  public override void SetValue(IDbDataParameter parameter, DayOfTheWeekFlag value)
  {
    parameter.DbType = DbType.String;
    parameter.Value = value.FlagValue.ToCharArray();
  }

  public override DayOfTheWeekFlag Parse(object value)
  {
    return value switch
    {
      string s => new DayOfTheWeekFlag(s),
      _ => throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}")
    };
  }
}