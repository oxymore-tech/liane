using Liane.Api.Routing;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Liane.Service.Internal.Mongo.Serialization;

internal sealed class LatLngBsonSerializer : StructSerializerBase<LatLng>
{
    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, LatLng value)
    {
        context.Writer.WriteStartDocument();
        context.Writer.WriteName("type");
        context.Writer.WriteString("Point");
        context.Writer.WriteName("coordinates");
        context.Writer.WriteStartArray();
        context.Writer.WriteDouble(value.Lng);
        context.Writer.WriteDouble(value.Lat);
        context.Writer.WriteEndArray();
        context.Writer.WriteEndDocument();
    }

    public override LatLng Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
    {
        var serializer = BsonSerializer.LookupSerializer(typeof(BsonDocument));
        var document = serializer.Deserialize(context, args)
            .ToBsonDocument();
        var bsonArray = document["coordinates"].AsBsonArray;
        return new LatLng(bsonArray[1].AsDouble, bsonArray[0].AsDouble);
    }
}