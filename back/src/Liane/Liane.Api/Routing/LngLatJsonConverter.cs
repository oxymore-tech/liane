using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Liane.Api.Routing
{
    public sealed class LngLatJsonConverter : JsonConverter<LngLat>
    {
        public override void WriteJson(JsonWriter writer, LngLat value, JsonSerializer serializer)
        {
            writer.WriteStartObject();
            writer.WritePropertyName("lat");
            writer.WriteValue(value.Lat);
            writer.WritePropertyName("lng");
            writer.WriteValue(value.Lng);
            writer.WriteEndObject();
        }

        public override LngLat ReadJson(JsonReader reader, Type objectType, LngLat existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            return reader.TokenType switch
            {
                JsonToken.StartArray => FromArray(reader, serializer),
                JsonToken.StartObject => FromObject(reader),
                _ => throw new JsonException($"Unexpected token type {reader.TokenType}")
            };
        }

        private static LngLat FromObject(JsonReader reader)
        {
            var obj = JObject.Load(reader);
            return new LngLat(obj.GetValue("Lng", StringComparison.InvariantCultureIgnoreCase).ToObject<double>(), obj.GetValue("Lat", StringComparison.InvariantCultureIgnoreCase).ToObject<double>());
        }

        private static LngLat FromArray(JsonReader reader, JsonSerializer serializer)
        {
            var values = serializer.Deserialize<double[]>(reader);
            if (values.Length != 2)
            {
                throw new JsonException($"Expecting double array of length 2 : {values}");
            }

            return new LngLat(values[0], values[1]);
        }
    }
}