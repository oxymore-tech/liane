using Liane.Api.Trip;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

internal sealed class DayOfTheWeekFlagSerializer : StructSerializerBase<DayOfTheWeekFlag>
{
    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, DayOfTheWeekFlag value)
    {
      context.Writer.WriteString(value.FlagValue);
    }

    public override DayOfTheWeekFlag Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
    {
        var value = context.Reader.ReadString()!;
        return new DayOfTheWeekFlag { FlagValue = value };
    }
}
