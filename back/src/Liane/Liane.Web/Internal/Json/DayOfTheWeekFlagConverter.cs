using System;
using System.Linq;
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

    var value = reader.GetString()!;
    if (value.All(c => c == '1' || c == '0') && value.Length == 7)
    {
      return new DayOfTheWeekFlag { FlagValue = value };
    } 
    throw new JsonException($"Wrong flag format: '{value}'");
  }

  public override void Write(Utf8JsonWriter writer, DayOfTheWeekFlag value, JsonSerializerOptions options)
  {
    writer.WriteStringValue(value.FlagValue);
  }
}
