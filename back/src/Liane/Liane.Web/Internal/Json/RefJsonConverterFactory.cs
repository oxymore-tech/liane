using System;
using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Util.Ref;

namespace Liane.Web.Internal.Json;

public sealed class RefJsonConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert)
        => typeToConvert.IsGenericType
           && typeToConvert.GetGenericTypeDefinition() == typeof(Ref<>);

    public override JsonConverter CreateConverter(
        Type typeToConvert, JsonSerializerOptions options)
    {
        Debug.Assert(typeToConvert.IsGenericType &&
                     typeToConvert.GetGenericTypeDefinition() == typeof(Ref<>));

        var elementType = typeToConvert.GetGenericArguments()[0];

        var converter = (JsonConverter)Activator.CreateInstance(
            typeof(RefJsonConverter<>)
                .MakeGenericType(elementType),
            BindingFlags.Instance | BindingFlags.Public,
            binder: null,
            args: null,
            culture: null)!;

        return converter;
    }
}