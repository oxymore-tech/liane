using System;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Liane.Api.Util.Ref;

namespace Liane.Web.Internal.Json;

public sealed class PolymorphicTypeResolver : DefaultJsonTypeInfoResolver
{
  public override JsonTypeInfo GetTypeInfo(Type type, JsonSerializerOptions options)
  {
    var jsonTypeInfo = base.GetTypeInfo(type, options);

    if (jsonTypeInfo.Type.GetCustomAttribute(typeof(UnionAttribute)) is null)
    {
      return jsonTypeInfo;
    }

    var candidateDerivedTypes = jsonTypeInfo.Type.GetNestedTypes()
      .Where(t => t.IsAssignableTo(jsonTypeInfo.Type))
      .ToArray();

    if (candidateDerivedTypes.Length == 0)
    {
      return jsonTypeInfo;
    }

    var polymorphismOptions = new JsonPolymorphismOptions
    {
      TypeDiscriminatorPropertyName = "type",
      IgnoreUnrecognizedTypeDiscriminators = true,
      UnknownDerivedTypeHandling = JsonUnknownDerivedTypeHandling.FallBackToNearestAncestor,
    };

    foreach (var jsonDerivedType in candidateDerivedTypes)
    {
      polymorphismOptions.DerivedTypes.Add(new JsonDerivedType(jsonDerivedType, jsonDerivedType.Name));
    }

    jsonTypeInfo.PolymorphismOptions = polymorphismOptions;

    return jsonTypeInfo;
  }
}