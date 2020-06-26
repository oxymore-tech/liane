using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Liane.Api.Routing
{
    public sealed class LatLngJsonConverter : JsonConverter<LatLng>
    {
        public override void WriteJson(JsonWriter writer, LatLng value, JsonSerializer serializer)
        {
            writer.WriteStartArray();
            writer.WriteValue(value.Lat);
            writer.WriteValue(value.Lng);
            writer.WriteEndArray();
        }

        public override LatLng ReadJson(JsonReader reader, Type objectType, LatLng existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            return reader.TokenType switch
            {
                JsonToken.StartArray => FromArray(reader, serializer),
                JsonToken.StartObject => FromObject(reader),
                _ => throw new JsonException($"Unexpected token type {reader.TokenType}")
            };
        }

        private static LatLng FromObject(JsonReader reader)
        {
            var obj = JObject.Load(reader);
            return new LatLng(obj.GetValue("Lat", StringComparison.InvariantCultureIgnoreCase).ToObject<double>(), obj.GetValue("Lng", StringComparison.InvariantCultureIgnoreCase).ToObject<double>());
        }

        private static LatLng FromArray(JsonReader reader, JsonSerializer serializer)
        {
            var values = serializer.Deserialize<double[]>(reader);
            if (values.Length != 2)
            {
                throw new JsonException($"Expecting double array of length 2 : {values}");
            }

            return new LatLng(values[0], values[1]);
        }
    }
}