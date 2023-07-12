using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using LngLatTuple = System.Tuple<double, double>;

namespace Liane.Service.Internal.Osrm;

internal sealed class LngLatTupleJsonConverter : JsonConverter<LngLatTuple>
{
  public override LngLatTuple Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    if (reader.TokenType != JsonTokenType.StartArray)
    {
      ThrowJsonException();
    }

    if (!reader.Read())
    {
      ThrowJsonException();
    }

    var lng = reader.GetDouble();
    if (!reader.Read())
    {
      ThrowJsonException();
    }

    var lat = reader.GetDouble();
    if (!reader.Read())
    {
      ThrowJsonException();
    }

    if (reader.TokenType != JsonTokenType.EndArray)
    {
      throw new JsonException("LngLatTuple must deserialize from an array of length 2");
    }

    return new LngLatTuple(lng, lat);
  }

  public override void Write(Utf8JsonWriter writer, LngLatTuple value, JsonSerializerOptions options)
  {
    writer.WriteStartArray();
    JsonSerializer.Serialize(writer, value.Item1, options);
    JsonSerializer.Serialize(writer, value.Item2, options);
    writer.WriteEndArray();
  }

  private static void ThrowJsonException()
  {
    throw new JsonException("LngLatTuple must deserialize from an array of length 2");
  }
}