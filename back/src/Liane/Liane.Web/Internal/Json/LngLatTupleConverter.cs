using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Liane.Web.Internal.Json;

internal sealed class LngLatTupleConverter : JsonConverter<Tuple<double, double>>
{
  public override Tuple<double, double> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    if (reader.TokenType != JsonTokenType.StartArray)
    {
      throw new JsonException();
    }

    reader.Read();
    var lng = reader.GetDouble();
    reader.Read(); // End of Array
    var lat = reader.GetDouble();
    return new Tuple<double, double>(lng, lat);
  }

  public override void Write(Utf8JsonWriter writer, Tuple<double, double> value, JsonSerializerOptions options)
  {
    writer.WriteStartArray();
    writer.WriteNumberValue(value.Item1);
    writer.WriteNumberValue(value.Item2);
    writer.WriteEndArray();
  }
}