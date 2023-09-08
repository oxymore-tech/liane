using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Liane.Service.Internal.Util.Sql;

internal sealed class NamedParams
{
  private static readonly MethodInfo EnumerableToArray =
    typeof(NamedParams).GetMethod(nameof(ToArray), 1, BindingFlags.Static | BindingFlags.NonPublic, null, new[] { typeof(IEnumerable) }, null)!;

  private readonly IDictionary<string, object?> parameters = new Dictionary<string, object?>();
  private readonly IDictionary<object, string> names = new Dictionary<object, string>();

  public string Add(object? value)
  {
    if (value is null)
    {
      return "NULL";
    }

    if (names.TryGetValue(value, out var existingName))
    {
      return existingName;
    }

    var name = $"@param{parameters.Count}";
    names.Add(value, name);
    parameters.Add(name, MaterializeArrayIfNeeded(value));
    return name;
  }

  public IDictionary<string, object?> ToSqlParameters() => parameters;

  private static object MaterializeArrayIfNeeded(object obj) => obj switch
  {
    string _ => obj,
    IDictionary _ => obj,
    IDictionary<string, object> _ => obj,
    IEnumerable e => MaterializeArrayIfNeeded(e),
    _ => obj
  };

  private static object MaterializeArrayIfNeeded(IEnumerable obj)
  {
    var genericTypeArgument = obj.GetType().GetInterface(typeof(IEnumerable<>).Name)!.GenericTypeArguments[0];
    var nullableTypeArgument = Nullable.GetUnderlyingType(genericTypeArgument);
    if (nullableTypeArgument != null)
    {
      return ConvertToArray(obj, nullableTypeArgument);
    }

    return obj is not (Array or IList)
      ? ConvertToArray(obj, genericTypeArgument)
      : obj;
  }

  private static Array ConvertToArray(IEnumerable obj, Type nullableTypeArgument)
  {
    return (Array)EnumerableToArray.MakeGenericMethod(nullableTypeArgument).Invoke(null, new[] { (object)obj })!;
  }

  private static T[] ToArray<T>(IEnumerable e)
  {
    return e.Cast<T>().ToArray();
  }
}