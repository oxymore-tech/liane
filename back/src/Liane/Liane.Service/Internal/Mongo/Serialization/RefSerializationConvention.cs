using System;
using System.Collections.Immutable;
using Liane.Api.Util.Ref;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;

namespace Liane.Service.Internal.Mongo.Serialization;

public sealed class RefSerializationConvention : ConventionBase, IMemberMapConvention
{
  private readonly ImmutableList<Type> typesWithStringId;

  public RefSerializationConvention(ImmutableList<Type> typesWithStringId)
  {
    this.typesWithStringId = typesWithStringId;
  }

  public RefSerializationConvention(string name, ImmutableList<Type> typesWithStringId) : base(name)
  {
    this.typesWithStringId = typesWithStringId;
  }

  /// <inheritdoc/>
  public void Apply(BsonMemberMap memberMap)
  {
    if (!memberMap.MemberType.IsGenericType || !memberMap.MemberType.GetGenericTypeDefinition().IsAssignableFrom(typeof(Ref<>)))
    {
      return;
    }

    var referencedType = memberMap.MemberType.GetGenericArguments()[0];
    var serializerType = typesWithStringId.Contains(referencedType)
      ? typeof(RefToStringBsonSerializer<>).MakeGenericType(referencedType)
      : typeof(RefToObjectIdBsonSerializer<>).MakeGenericType(referencedType);

    memberMap.SetSerializer((IBsonSerializer)Activator.CreateInstance(serializerType)!);
  }
}