using System;
using System.Collections.Immutable;
using System.Linq;
using System.Reflection;
using System.Text;
using Liane.Api.Util;
using Microsoft.IdentityModel.Tokens;

namespace Liane.Service.Internal.Util.Sql;

public sealed record InsertQuery<T>(object Parameters, bool IgnoreConflicts = true) : IQuery<T>
{
  public InsertQuery<T> SetIgnoreConflicts(bool ignoreConflicts) => this with { IgnoreConflicts = ignoreConflicts };

  public (string Sql, object? Params) ToSql()
  {
    var stringBuilder = new StringBuilder();
    stringBuilder.Append($"INSERT INTO {Mapper.GetTableName<T>()} ");

    var properties = typeof(T)
      .GetProperties(BindingFlags.Instance | BindingFlags.Public)
      .ToImmutableList();

    if (properties.IsNullOrEmpty())
    {
      throw new ArgumentException($"Empty insert {typeof(T).Name}");
    }

    stringBuilder.Append($"({string.Join(", ", properties.Select(p => Mapper.GetColumnName(p.Name)))}) VALUES ({string.Join(", ", properties.Select(p => $"@{p.Name}"))})");

    if (IgnoreConflicts)
    {
      stringBuilder.Append(" ON CONFLICT DO NOTHING");
    }

    return (stringBuilder.ToString(), Parameters);
  }
}