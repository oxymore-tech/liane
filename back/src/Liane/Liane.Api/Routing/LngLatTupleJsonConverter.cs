using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Liane.Api.Routing;

public sealed class LngLatTupleJsonConverter : JsonConverter<LngLatTuple>
{
    public override LngLatTuple? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var array = JsonSerializer.Deserialize<double[]>(ref reader, options);
        if (array == null)
        {
            return null;
        }

        if (array.Length == 2)
        {
            return new LngLatTuple(array[0], array[1]);
        }

        throw new JsonException($"Unable to read LngLatTuple from {reader.TokenType}");
    }

    public override void Write(Utf8JsonWriter writer, LngLatTuple value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();
        writer.WriteNumberValue(value.Item1);
        writer.WriteNumberValue(value.Item2);
        writer.WriteEndArray();
    }
}