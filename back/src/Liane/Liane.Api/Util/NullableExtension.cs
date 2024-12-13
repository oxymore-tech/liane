using System;
using System.Reflection;
using System.Threading.Tasks;

namespace Liane.Api.Util;

public static class NullableExtension
{
  private static readonly NullabilityInfoContext NullabilityInfoContext = new();
  
  public static TTo? GetOrDefault<TFrom, TTo>(this TFrom? from, Func<TFrom, TTo?> selector)
    where TFrom : notnull
    where TTo : class
  {
    return from == null ? default : selector(from);
  }
  
  public static TTo? GetOrDefault<TFrom, TTo>(this TFrom? from, Func<TFrom, TTo?> selector)
    where TFrom : struct
    where TTo : class
  {
    return from == null ? default : selector(from.Value);
  }
  
  public static TTo? GetOrDefault<TFrom, TTo>(this TFrom? from, Func<TFrom, TTo?> selector)
    where TFrom : struct
    where TTo : struct
  {
    return from == null ? default : selector(from.Value);
  }

  public static async Task<TTo?> GetOrDefault<TFrom, TTo>(this TFrom? from, Func<TFrom, Task<TTo?>> selector)
    where TFrom : struct
    where TTo : struct
  {
    return from == null ? default : await selector(from.Value);
  }

  public static bool IsNullable(this PropertyInfo property)
  {
    var nullabilityInfo = NullabilityInfoContext.Create(property);
    return nullabilityInfo.ReadState == NullabilityState.Nullable;
  }

  public static bool IsNullable(this ParameterInfo property)
  {
    var enclosingType = property.ParameterType;
    if (enclosingType == null)
    {
      throw new ArgumentException("Property must have a DeclaringType");
    }

    if (Nullable.GetUnderlyingType(enclosingType) != null)
    {
      return true;
    }

    var nullabilityInfo = NullabilityInfoContext.Create(property);
    return nullabilityInfo.WriteState == NullabilityState.Nullable;
  }
}