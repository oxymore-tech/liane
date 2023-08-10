using System;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Util.Ref;

namespace Liane.Web.Internal.Json;

internal sealed class UnionJsonConverterFactory : JsonConverterFactory
{
  public override bool CanConvert(Type typeToConvert) => typeToConvert.GetCustomAttribute(typeof(UnionAttribute)) is not null;

  public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
  {
    var elementType = GetRootType(typeToConvert);
    return (JsonConverter)Activator.CreateInstance(typeof(UnionJsonConverter<>).MakeGenericType(elementType))!;
  }

  private static Type GetRootType(Type toCheck)
  {
    var current = toCheck;
    while (current != null && current != typeof(object))
    {
      if (current.GetCustomAttribute(typeof(UnionAttribute), false) is not null)
      {
        return current;
      }

      current = current.BaseType;
    }

    throw new JsonException($"Unable to find root Union type for {toCheck}");
  }
}