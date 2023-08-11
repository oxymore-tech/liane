using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Trip;

namespace Liane.Web.Internal.Json;

public class DayOfTheWeekFlagConverter : JsonConverter<DayOfTheWeekFlag>
{
  public override DayOfTheWeekFlag Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    if (reader.TokenType != JsonTokenType.String)
    {
      throw new JsonException();
    }
    return new DayOfTheWeekFlag{FlagValue = reader.GetString()!};
  }

  public override void Write(Utf8JsonWriter writer, DayOfTheWeekFlag value, JsonSerializerOptions options)
  {
    writer.WriteStringValue(value.FlagValue);
  }
}
