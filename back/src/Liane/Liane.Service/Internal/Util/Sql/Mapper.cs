using System;
using System.Collections.Immutable;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Reflection;
using Liane.Api.Util;
using Microsoft.IdentityModel.Tokens;

namespace Liane.Service.Internal.Util.Sql;

public static class Mapper
{
  public static string GetTableName<T>()
  {
    var type = typeof(T);
    var tableAttribute = type.GetCustomAttribute<TableAttribute>();
    if (tableAttribute != null)
    {
      return tableAttribute.Name;
    }

    var snakeCase = type.Name.ToSnakeCase();
    if (snakeCase.EndsWith("_db"))
    {
      snakeCase = snakeCase[..^3];
    }

    return snakeCase;
  }

  public static string GetColumnName(string property) => property.ToSnakeCase();

  public static ImmutableList<FieldDefinition<T>> GetColumns<T>()
  {
    return GetProperties<T>()
      .Select(p => (FieldDefinition<T>)new FieldDefinition<T>.Member(p))
      .ToImmutableList();
  }

  public static ImmutableList<PropertyInfo> GetProperties<T>()
  {
    var properties = typeof(T)
      .GetProperties(BindingFlags.Instance | BindingFlags.Public)
      .ToImmutableList();

    if (properties.IsNullOrEmpty())
    {
      throw new ArgumentException($"Empty insert {typeof(T).Name}");
    }

    return properties;
  }
}