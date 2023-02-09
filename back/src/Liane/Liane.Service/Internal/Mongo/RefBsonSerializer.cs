using Liane.Api.Util.Ref;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

internal sealed class RefBsonSerializer<T> : SerializerBase<Ref<T>> where T : class, IIdentity
{
    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, Ref<T> value)
    {
        context.Writer.WriteString(value);
    }

    public override Ref<T> Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
    {
        return context.Reader.ReadString();
    }
}