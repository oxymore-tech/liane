using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo;

internal class TimeOnlyBsonSerializer : StructSerializerBase<TimeOnly>
{
    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, TimeOnly value)

    {
        context.Writer.WriteStartDocument();
        context.Writer.WriteName(nameof(value.Hour));
        context.Writer.WriteInt32(value.Hour);
        context.Writer.WriteName(nameof(value.Minute));
        context.Writer.WriteInt32(value.Minute);
        context.Writer.WriteEndDocument();
    }


    public override TimeOnly Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)

    {
        var ticks = context.Reader.ReadDateTime();

        var dateTime = BsonUtils.ToDateTimeFromMillisecondsSinceEpoch(ticks);

        return new TimeOnly(dateTime.Year, dateTime.Month, dateTime.Day);
    }
}