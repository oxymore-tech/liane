using System;
using System.Linq;
using System.Reflection;
using System.Text.Json.Serialization.Metadata;
using Liane.Api.Util;
using Liane.Api.Util.Ref;

namespace Liane.Web.Internal.Json;

public static class RefJsonStrategy
{
  private static readonly MethodInfo AsResolvedMethod = typeof(RefJsonStrategy).GetMethod(nameof(AsResolved), BindingFlags.Static | BindingFlags.NonPublic)!;

  public static Action<JsonTypeInfo> CreateRefResolutionModifier()
  {
    return typeInfo =>
    {
      var jsonPropertyInfos = typeInfo.Properties.Where(p => p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(Ref<>));

      foreach (var jsonPropertyInfo in jsonPropertyInfos)
      {
        if (jsonPropertyInfo.Get is null)
        {
          continue;
        }

        var propertyInfo = typeInfo.Type.GetProperty(jsonPropertyInfo.Name.Capitalize());
        if (propertyInfo is null)
        {
          continue;
        }

        var expectResolved = jsonPropertyInfo.AttributeProvider?.GetCustomAttributes(typeof(SerializeAsResolvedRefAttribute), true).Any() ?? false;

        jsonPropertyInfo.Get = o =>
        {
          var value = propertyInfo.GetValue(o);
          if (value is null)
          {
            return null;
          }

          var asResolved = AsResolvedMethod.MakeGenericMethod(jsonPropertyInfo.PropertyType.GenericTypeArguments[0]);
          return asResolved.Invoke(null, new[] { value, expectResolved });
        };
      }
    };
  }

  private static Ref<T>? AsResolved<T>(Ref<T> reference, bool expectResolved) where T : class, IIdentity
  {
    if (!expectResolved)
    {
      return reference.Id;
    }

    return reference is not Ref<T>.Resolved ? null : reference;
  }
}