using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Dapper;
using Npgsql;
using NpgsqlTypes;

namespace Liane.Service.Internal.Postgis.Db.Handler;

public sealed class EnumerableTypeHandler<TItem, TItemDb>(Func<TItem, TItemDb> format, Func<TItemDb, TItem?> parse, Func<IEnumerable<TItem>, object> collect) : SqlMapper.ITypeHandler
{
  private static readonly NpgsqlDbType ArrayDbType = typeof(TItemDb) == typeof(string) ? NpgsqlDbType.Varchar : NpgsqlDbType.Integer;

  public void SetValue(IDbDataParameter parameter, object? value)
  {
    var v = value as IEnumerable<TItem>;
    // ReSharper disable once BitwiseOperatorOnEnumWithoutFlags
    ((NpgsqlParameter)parameter).NpgsqlDbType = NpgsqlDbType.Array | ArrayDbType;
    parameter.Value = v is null ? DBNull.Value : v.Select(format).ToArray();
  }

  public object Parse(Type destinationType, object value)
  {
    return value switch
    {
      IEnumerable<TItemDb> array => collect(array.Select(parse).Where(o => o is not null).Cast<TItem>()),
      _ => throw new ArgumentOutOfRangeException($"Unable to read from {value.GetType()}")
    };
  }
}