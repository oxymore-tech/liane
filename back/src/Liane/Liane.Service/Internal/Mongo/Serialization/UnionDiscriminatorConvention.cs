using System;
using System.Linq;
using System.Reflection;
using Liane.Api.Util.Ref;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;

namespace Liane.Service.Internal.Mongo.Serialization;

internal sealed class UnionDiscriminatorConvention : IDiscriminatorConvention
{
  internal const string Type = "_t";

  public string ElementName => Type;

  public static void Register()
  {
    foreach (var type in AppDomain.CurrentDomain.GetAssemblies()
               .SelectMany(a => a.GetTypes())
               .Where(IsUnionRootType))
    {
      BsonSerializer.RegisterDiscriminatorConvention(type, new UnionDiscriminatorConvention());
    }
  }

  private static bool IsUnionRootType(Type type)
  {
    return type.GetCustomAttribute(typeof(UnionAttribute)) is not null && type.IsAbstract;
  }

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
      throw new Exception($"Cannot use {nameof(UnionDiscriminatorConvention)} for type " + nominalType);
    }

    return actualType.Name;
  }
}