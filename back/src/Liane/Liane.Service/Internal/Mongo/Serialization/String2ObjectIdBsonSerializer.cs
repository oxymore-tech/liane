using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

public sealed class String2ObjectIdBsonSerializer : SerializerBase<string?>
{
  public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, string? value)
  {
    context.Writer.WriteObjectId(ObjectId.Parse(value));
  }

  public override string? Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
  {
    return context.Reader.ReadObjectId().ToString();
  }
}