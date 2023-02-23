using Liane.Api.Util.Ref;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

internal sealed class RefToStringBsonSerializer<T> : SerializerBase<Ref<T>?> where T : class, IIdentity
{
  public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, Ref<T>? value)
  {
    if (value is not null)
    {
      context.Writer.WriteString(value);
    }
    else
    {
      context.Writer.WriteNull();
    }
  }

  public override Ref<T>? Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
  {
    var bsonType = context.Reader.CurrentBsonType;
    if (bsonType == BsonType.String) return context.Reader.ReadString();
    context.Reader.ReadNull();
    return null;
  }
}

internal sealed class RefToObjectIdBsonSerializer<T> : SerializerBase<Ref<T>?> where T : class, IIdentity
{
  public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, Ref<T>? value)
  {
    if (value is not null)
    {
      context.Writer.WriteObjectId(ObjectId.Parse(value));
    }
    else
    {
      context.Writer.WriteNull();
    }
  }

  public override Ref<T>? Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
  {
    var bsonType = context.Reader.CurrentBsonType;
    if (bsonType == BsonType.ObjectId) return (Ref<T>)context.Reader.ReadObjectId().ToString();
    context.Reader.ReadNull();
    return null;
  }
}