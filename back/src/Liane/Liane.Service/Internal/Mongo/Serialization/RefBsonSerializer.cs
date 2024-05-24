using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

internal static class RefBsonSerializer
{
  internal static readonly ImmutableHashSet<Type> TypesWithStringId = ImmutableHashSet.Create(typeof(RallyingPoint), typeof(Api.Community.Liane));
}

internal sealed class RefBsonSerializer<T> : SerializerBase<Ref<T>?> where T : class, IIdentity
{
  public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, Ref<T>? value)
  {
    if (value is not null)
    {
      if (RefBsonSerializer.TypesWithStringId.Contains(typeof(T)))
      {
        context.Writer.WriteString(value);
      }
      else
      {
        context.Writer.WriteObjectId(ObjectId.Parse(value));
      }
    }
    else
    {
      context.Writer.WriteNull();
    }
  }

  public override Ref<T>? Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
  {
    var bsonType = context.Reader.CurrentBsonType;
    switch (bsonType)
    {
      case BsonType.String:
        return (Ref<T>)context.Reader.ReadString();
      case BsonType.ObjectId:
        return (Ref<T>)context.Reader.ReadObjectId().ToString();
      case BsonType.Document:
        return BsonSerializer.Deserialize<T>(context.Reader);
      default:
        context.Reader.ReadNull();
        return null;
    }
  }
}