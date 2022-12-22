using System;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo;

internal sealed class TimeOnlyBsonSerializer : StructSerializerBase<TimeOnly>
{
    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, TimeOnly value)
    {
        // Store as total number of seconds
        context.Writer.WriteInt32(value.Hour*3600 + value.Minute*60 + value.Second);
    }

    public override TimeOnly Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
    {
        var minutesOfDay = context.Reader.ReadInt32() / 60;
        return new TimeOnly(minutesOfDay / 60, minutesOfDay % 60);
    }
}