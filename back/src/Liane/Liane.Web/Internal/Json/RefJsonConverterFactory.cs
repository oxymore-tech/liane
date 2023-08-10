using System;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Util.Ref;

namespace Liane.Web.Internal.Json;

internal sealed class RefJsonConverterFactory : JsonConverterFactory
{
  public override bool CanConvert(Type typeToConvert)
    => IsSubclassOfRawGeneric(typeof(Ref<>), typeToConvert);

  public override JsonConverter CreateConverter(
    Type typeToConvert, JsonSerializerOptions options)
  {
    var elementType = typeToConvert.GetGenericArguments()[0];

    return (JsonConverter)Activator.CreateInstance(
      typeof(RefJsonConverter<>)
        .MakeGenericType(elementType),
      BindingFlags.Instance | BindingFlags.Public,
      binder: null,
      args: null,
      culture: null)!;
  }

  private static bool IsSubclassOfRawGeneric(Type generic, Type toCheck)
  {
    var current = toCheck;
    while (current != null && current != typeof(object))
    {
      var cur = current.IsGenericType ? current.GetGenericTypeDefinition() : current;
      if (generic == cur)
      {
        return true;
      }

      current = current.BaseType;
    }

    return false;
  }
}