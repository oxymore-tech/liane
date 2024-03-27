using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Trip;

namespace Liane.Web.Internal.Json;

public sealed class DayOfWeekFlagConverter : JsonConverter<DayOfWeekFlag>
{
  public override DayOfWeekFlag Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    if (reader.TokenType != JsonTokenType.String)
    {
      throw new JsonException();
    }

    var value = reader.GetString()!;
    return DayOfWeekFlag.Parse(value);
  }

  public override void Write(Utf8JsonWriter writer, DayOfWeekFlag value, JsonSerializerOptions options)
  {
    writer.WriteStringValue(value.ToString());
  }
}