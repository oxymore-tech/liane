using Liane.Api.Trip;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

internal sealed class DayOfWeekFlagSerializer : StructSerializerBase<DayOfWeekFlag>
{
  public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, DayOfWeekFlag value)
  {
    context.Writer.WriteString(value.PrintToString());
  }

  public override DayOfWeekFlag Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
  {
    var value = context.Reader.ReadString()!;
    return DayOfWeekFlagUtils.FromString(value);
  }
}