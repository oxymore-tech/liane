using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Microsoft.IdentityModel.Tokens;

namespace Liane.Web.Internal.Json;

internal sealed class UnionJsonConverter<TRoot> : JsonConverter<TRoot> where TRoot : notnull
{
  private const string Discriminator = "type";
  private readonly ImmutableDictionary<string, Type> subTypes;
  private readonly ImmutableDictionary<Type, TypeInfo> allTypeInfo;

  public UnionJsonConverter()
  {
    subTypes = GetSubTypes(typeof(TRoot))
      .ToImmutableDictionary(t => t.Name.ToLowerInvariant());
    allTypeInfo = GetSubTypes(typeof(TRoot))
      .ToImmutableDictionary(
        t => t,
        t =>
        {
          var propertyInfos = t.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.GetCustomAttribute(typeof(JsonIgnoreAttribute), false) is null)
            .ToImmutableList();
          return new TypeInfo(t.GetConstructors()[0], propertyInfos);
        }
      );
  }

  public override TRoot Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    var jsonObject = JsonSerializer.Deserialize<JsonObject>(ref reader, options);
    if (jsonObject is null)
    {
      throw new JsonException("Expected JsonObject while deserializing Union");
    }

    var subType = typeToConvert.IsAbstract ? GetSubType(jsonObject) : typeToConvert;

    var missing = new List<string>();
    var constructorInfo = allTypeInfo[subType].ConstructorInfo;
    var parameters = constructorInfo.GetParameters()
      .Select(p =>
      {
        var parameterName = p.Name!.ToLower();
        var value = jsonObject[parameterName];
        if (value is not null)
        {
          return value.Deserialize(p.ParameterType, options) ?? throw new JsonException("Unable to deserialize parameter");
        }

        if (p.HasDefaultValue)
        {
          return p.DefaultValue;
        }

        if (!p.IsNullable())
        {
          missing.Add(parameterName);
        }

        return p.HasDefaultValue ? p.DefaultValue : null;
      }).ToArray();
    if (!missing.IsNullOrEmpty())
    {
      throw new ValidationException(missing.ToImmutableDictionary(v => v, _ => ValidationMessage.IsRequired));
    }

    return (TRoot)constructorInfo.Invoke(parameters);
  }

  public override void Write(Utf8JsonWriter writer, TRoot value, JsonSerializerOptions options)
  {
    writer.WriteStartObject();
    writer.WritePropertyName(Discriminator);
    writer.WriteStringValue(value.GetType().Name);
    foreach (var propertyInfo in allTypeInfo[value.GetType()].Properties)
    {
      var name = options.PropertyNamingPolicy?.ConvertName(propertyInfo.Name) ?? propertyInfo.Name;
      writer.WritePropertyName(name);
      JsonSerializer.Serialize(writer, propertyInfo.GetValue(value), options);
    }

    writer.WriteEndObject();
  }

  private static IEnumerable<Type> GetSubTypes(Type rootType)
  {
    return rootType.GetNestedTypes(BindingFlags.NonPublic | BindingFlags.Public)
      .SelectMany(t => t.IsAbstract ? GetSubTypes(t) : ImmutableList.Create(t));
  }

  private Type GetSubType(JsonObject jsonObject)
  {
    var discriminator = jsonObject[Discriminator];

    if (discriminator is null)
    {
      throw new JsonException($"Unable to find {Discriminator} property");
    }

    var typeName = discriminator.AsValue().ToString().ToLowerInvariant();

    var subType = subTypes.GetValueOrDefault(typeName);
    if (subType == null)
    {
      throw new JsonException($"Unable to find type named '{typeName}' ");
    }

    return subType;
  }
}

internal sealed record TypeInfo(ConstructorInfo ConstructorInfo, ImmutableList<PropertyInfo> Properties);