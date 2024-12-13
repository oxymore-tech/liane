using System;
using System.Collections.Immutable;
using System.Text.Json;
using Dapper;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Postgis.Db.Handler;

public static class CustomTypeHandler
{
  public static void AsJson<TItem>(JsonSerializerOptions options) where TItem : notnull
  {
    var handler = new JsonTypeHandler<TItem>(options);
    SqlMapper.AddTypeHandler(typeof(TItem), handler);
    foreach (var subtype in TypeInfo.GetNestedSubTypes(typeof(TItem), true))
    {
      SqlMapper.AddTypeHandler(subtype, handler);
    }
  }

  public static void AsString<TItem>(Func<TItem, string> format, Func<string, TItem?> parse) where TItem : notnull
  {
    var handler = new StringTypeHandler<TItem>(format, parse);
    SqlMapper.AddTypeHandler(typeof(TItem), handler);
    AsEnumerable(typeof(TItem), format, parse);
    foreach (var subtype in TypeInfo.GetNestedSubTypes(typeof(TItem), true))
    {
      SqlMapper.AddTypeHandler(subtype, handler);
      AsEnumerable(subtype, format, parse);
    }
  }

  public static void AsEnumerable<TItem>() where TItem : notnull
    => AsEnumerable<TItem, TItem>(typeof(TItem), v => v, v => v);

  public static void AsEnumerable<TItem, TType>(Func<TItem, TType> format, Func<TType, TItem?> parse) where TType : notnull
    => AsEnumerable(typeof(TItem), format, parse);

  private static void AsEnumerable<TItem, TType>(Type type, Func<TItem, TType> format, Func<TType, TItem?> parse) where TType : notnull
  {
    SqlMapper.AddTypeHandler(typeof(ImmutableList<>).MakeGenericType(type), new EnumerableTypeHandler<TItem, TType>(format, parse, e => e.ToImmutableList()));
    SqlMapper.AddTypeHandler(typeof(ImmutableHashSet<>).MakeGenericType(type), new EnumerableTypeHandler<TItem, TType>(format, parse, e => e.ToImmutableHashSet()));
  }
}