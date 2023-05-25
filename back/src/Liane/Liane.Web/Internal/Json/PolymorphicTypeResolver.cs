using System;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Liane.Api.Util;
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

    var subTypes = jsonTypeInfo.Type.GetSubTypes();

    if (subTypes.IsEmpty)
    {
      return jsonTypeInfo;
    }

    var polymorphismOptions = new JsonPolymorphismOptions
    {
      TypeDiscriminatorPropertyName = "type",
      IgnoreUnrecognizedTypeDiscriminators = true,
      UnknownDerivedTypeHandling = JsonUnknownDerivedTypeHandling.FallBackToNearestAncestor,
    };

    foreach (var (subTypeName, subType) in subTypes)
    {
      polymorphismOptions.DerivedTypes.Add(new JsonDerivedType(subType, subTypeName));
    }

    jsonTypeInfo.PolymorphismOptions = polymorphismOptions;

    return jsonTypeInfo;
  }
}