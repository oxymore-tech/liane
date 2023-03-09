using System;
using System.Linq;
using System.Reflection;
using Liane.Api.Util.Ref;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Serialization;

public sealed class PolymorphicTypeDiscriminatorConvention : IDiscriminatorConvention
{
  public static FilterDefinition<T> GetDiscriminatorFilter<T>()
  {
    return new BsonDocument("_t", typeof(T).Name);
  }

  public string ElementName => "_t";

  public Type GetActualType(IBsonReader bsonReader, Type nominalType)
  {
    var bookmark = bsonReader.GetBookmark();
    bsonReader.ReadStartDocument();
    var foundType = nominalType;
    var nestedChildTypes = nominalType.GetNestedTypes().Where(t => t.IsAssignableTo(nominalType)).ToArray();
    if (bsonReader.FindElement(ElementName) && nestedChildTypes.Length > 0)
    {
      var value = bsonReader.ReadString();
      var declaredType = nestedChildTypes.FirstOrDefault(t => t.Name == value);

      foundType = declaredType ?? throw new BsonException($"Unknown type {value} for base type" + nominalType);
    }

    bsonReader.ReturnToBookmark(bookmark);

    return foundType;
  }

  public BsonValue GetDiscriminator(Type nominalType, Type actualType)
  {
    if (actualType.GetCustomAttribute(typeof(UnionAttribute)) is null)
    {
      throw new Exception($"Cannot use {nameof(PolymorphicTypeDiscriminatorConvention)} for type " + nominalType);
    }

    return actualType.Name;
  }
}