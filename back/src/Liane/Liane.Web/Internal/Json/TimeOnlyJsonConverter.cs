using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Liane.Web.Internal.Json;

internal sealed class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    private const string Hour = "hour";
    private const string Minutes = "minutes";

    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var time = new TimeOnly(0, 0);

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndObject)
                return time;

            if (reader.TokenType != JsonTokenType.PropertyName)
                throw new JsonException("Unexpected token while deserializing TimeOnly");

            var propertyName = reader.GetString();
            reader.Read();

            switch (propertyName)
            {
                case Hour:
                    time.AddHours(reader.GetInt32());
                    break;
                case Minutes:
                    time.AddMinutes(reader.GetInt32());
                    break;
            }
        }

        throw new JsonException("Expected EndObject while deserializing TimeOnly");
    }

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();

        writer.WriteNumber(Hour, value.Hour);
        writer.WriteNumber(Minutes, value.Minute);

        writer.WriteEndObject();
    }
}