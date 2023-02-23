using System;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Liane.Api.Trip;

namespace Liane.Web.Internal.Json;

public sealed class PolymorphicTypeResolver : DefaultJsonTypeInfoResolver
{
  public override JsonTypeInfo GetTypeInfo(Type type, JsonSerializerOptions options)
  {
    var jsonTypeInfo = base.GetTypeInfo(type, options);

    if (jsonTypeInfo.Type != typeof(MatchType))
    {
      return jsonTypeInfo;
    }

    var polymorphismOptions = new JsonPolymorphismOptions
    {
      TypeDiscriminatorPropertyName = "type",
      IgnoreUnrecognizedTypeDiscriminators = true,
      UnknownDerivedTypeHandling = JsonUnknownDerivedTypeHandling.FailSerialization
    };
    foreach (var jsonDerivedType in type.Assembly.GetTypes()
               .Where(t => t != jsonTypeInfo.Type && t.IsAssignableTo(jsonTypeInfo.Type))
               .Select(t => new JsonDerivedType(t, t.Name))
               .ToArray())
    {
      polymorphismOptions.DerivedTypes.Add(jsonDerivedType);
    }

    jsonTypeInfo.PolymorphismOptions = polymorphismOptions;

    return jsonTypeInfo;
  }
}