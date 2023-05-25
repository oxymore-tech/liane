using System;
using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Util;

public static class TypeExtension
{
  public static Type? MatchSubType<T>(this string typeAsString)
    where T : class => MatchSubType(typeAsString, typeof(T));

  public static Type? MatchSubType(this string typeAsString, Type baseType)
  {
    var map = GetSubTypes(baseType);
    return map.GetValueOrDefault(typeAsString.NormalizeToCamelCase());
  }

  public static ImmutableSortedDictionary<string, Type> GetSubTypes(this Type baseType)
  {
    return baseType.GetNestedTypes()
      .Where(s => s.IsAssignableTo(baseType))
      .ToImmutableSortedDictionary(t => t.Name, t => t, StringComparer.OrdinalIgnoreCase);
  }
}