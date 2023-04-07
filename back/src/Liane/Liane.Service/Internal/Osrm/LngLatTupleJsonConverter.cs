using System;
using System.Collections.Immutable;
using System.Text.Json;
using System.Text.Json.Serialization;
using LngLatTuple = System.Tuple<double, double>;

namespace Liane.Service.Internal.Osrm;

internal sealed class LngLatTupleJsonConverter : JsonConverter<LngLatTuple>
{
  public override LngLatTuple Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    var array = JsonSerializer.Deserialize<ImmutableArray<double>>(ref reader, options);
    if (array.Length != 2)
    {
      throw new JsonException("LngLatTuple must deserialize from an array of length 2");
    }

    return new LngLatTuple(array[0], array[1]);
  }

  public override void Write(Utf8JsonWriter writer, LngLatTuple value, JsonSerializerOptions options)
  {
    writer.WriteStartArray();
    JsonSerializer.Serialize(writer, value.Item1, options);
    JsonSerializer.Serialize(writer, value.Item2, options);
    writer.WriteEndArray();
  }
}