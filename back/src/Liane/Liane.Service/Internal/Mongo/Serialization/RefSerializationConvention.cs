using System;
using System.Collections.Immutable;
using Liane.Api.Util.Ref;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;

namespace Liane.Service.Internal.Mongo.Serialization;

public class RefSerializationConvention : ConventionBase, IMemberMapConvention
{

  private readonly ImmutableList<Type> excludedTypes;

  public RefSerializationConvention(ImmutableList<Type> excludedTypes)
  {
    this.excludedTypes = excludedTypes;
  }

  public RefSerializationConvention(string name, ImmutableList<Type> excludedTypes) : base(name)
  {
    this.excludedTypes = excludedTypes;
  }

  /// <inheritdoc/>
  public void Apply(BsonMemberMap memberMap)
  {
    
    if (!memberMap.MemberType.IsGenericType || !memberMap.MemberType.GetGenericTypeDefinition().IsAssignableFrom(typeof(Ref<>)) )
    {
      return;
    }
    
    var referencedType = memberMap.MemberType.GetGenericArguments()[0];
    Type serializerType;
    if (excludedTypes.Contains(referencedType))
    {
      serializerType = typeof(RefToStringBsonSerializer<>).MakeGenericType(referencedType);
    }
    else
    {
      serializerType = typeof(RefToObjectIdBsonSerializer<>).MakeGenericType(referencedType);
    }

    memberMap.SetSerializer((IBsonSerializer)Activator.CreateInstance(serializerType)!);
  }
}