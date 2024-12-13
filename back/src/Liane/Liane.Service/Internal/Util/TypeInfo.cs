using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Reflection;
using Liane.Api.Util;

namespace Liane.Service.Internal.Util;

public sealed record ParameterInfo(
  string Name,
  Type Type,
  bool IsNullable,
  bool HasDefaultValue,
  object? DefaultValue,
  PropertyInfo PropertyInfo
)
{
  public static ParameterInfo Of(System.Reflection.ParameterInfo parameterInfo)
  {
    var name = parameterInfo.Name!;
    var declaringType = parameterInfo.Member.DeclaringType;
    if (declaringType is null)
    {
      throw new ArgumentException($"Unable to find declaring type on parameter info {name}");
    }

    var propertyInfo = declaringType.GetProperty(name.Capitalize());
    if (propertyInfo is null)
    {
      throw new ArgumentException($"Unable to find property '{name}' on type '{declaringType.Name}'. Not a record ?");
    }

    var hasDefaultValue = parameterInfo.HasDefaultValue || parameterInfo.ParameterType.IsValueType;
    var defaultValue = parameterInfo.HasDefaultValue
      ? parameterInfo.DefaultValue
      : parameterInfo.ParameterType.IsValueType
        ? Activator.CreateInstance(parameterInfo.ParameterType)
        : null;
    return new ParameterInfo(name, parameterInfo.ParameterType, parameterInfo.IsNullable(), hasDefaultValue, defaultValue, propertyInfo);
  }
}

public sealed record TypeInfo(
  ConstructorInfo ConstructorInfo,
  ImmutableArray<ParameterInfo> ParameterInfos,
  ImmutableDictionary<string, int> ParameterIndexes,
  ImmutableArray<ParameterInfo> ReadOnlyProperties)
{
  private static readonly object Mutex = new();
  private static readonly ConcurrentDictionary<Type, TypeInfo> Cache = new();

  public static IEnumerable<Type> GetNestedSubTypes(Type rootType, bool includeAbstract = false)
    => GetSubTypesR(rootType, includeAbstract, t => t.GetNestedTypes(BindingFlags.NonPublic | BindingFlags.Public));

  private static IEnumerable<Type> GetSubTypesR(Type rootType, bool includeAbstract, Func<Type, IEnumerable<Type>> subClassResolver)
  {
    return subClassResolver(rootType)
      .SelectMany(t =>
      {
        if (t.IsGenericType)
        {
          t = t.MakeGenericType(rootType.GetGenericArguments());
        }

        if (!t.IsSubclassOf(rootType))
        {
          return ImmutableList<Type>.Empty;
        }

        if (!t.IsAbstract)
        {
          return ImmutableList.Create(t);
        }

        var subTypes = GetSubTypesR(t, includeAbstract, subClassResolver);
        return !includeAbstract
          ? subTypes
          : ImmutableList.Create(t).Concat(subTypes);
      });
  }

  // ReSharper disable once InconsistentlySynchronizedField
  public static TypeInfo Of(Type type) => Cache.GetOrAdd(type, _ => OfInternal(type));

  private static TypeInfo OfInternal(Type type)
  {
    lock (Mutex)
    {
      if (Cache.TryGetValue(type, out var value))
      {
        return value;
      }

      var constructorInfo = type.GetConstructors()[0];
      var parameterInfos = constructorInfo.GetParameters();
      var parameterIndexes = parameterInfos
        .Select((p, i) => (p, i))
        .ToImmutableDictionary(e => e.p.Name!.ToLower(), e => e.i);
      var parameters = parameterInfos.Select(ParameterInfo.Of).ToImmutableArray();
      var readOnlyProperties = type.GetProperties(BindingFlags.Instance | BindingFlags.Public)
        .Where(p => !parameterIndexes.ContainsKey(p.Name.ToLower()))
        .Select(p => new ParameterInfo(p.Name, p.PropertyType, p.IsNullable(), false, null, p))
        .ToImmutableArray();
      return new TypeInfo(constructorInfo, parameters, parameterIndexes, readOnlyProperties);
    }
  }

  public ParameterInfo? GetParameterInfo(string name)
  {
    var index = GetParameterIndex(name);
    return index is null
      ? null
      : ParameterInfos[index.Value];
  }

  private int? GetParameterIndex(string name)
  {
    if (ParameterIndexes.TryGetValue(name.ToLowerInvariant(), out var index))
    {
      return index;
    }

    return null;
  }
}