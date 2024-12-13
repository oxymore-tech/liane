using System;
using System.Data;
using Dapper;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class StringTypeHandler<T>(Func<T, string> format, Func<string, T?> parse) : SqlMapper.TypeHandler<T>
{
  public override void SetValue(IDbDataParameter parameter, T? value)
  {
    parameter.DbType = DbType.String;
    parameter.Value = value is null ? DBNull.Value : format(value);
  }

  public override T? Parse(object value)
  {
    return value switch
    {
      string s => parse(s),
      _ => throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}")
    };
  }
}