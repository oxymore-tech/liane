using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Liane.Api.Trip;

public class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    private static class TimeParameter
    {
        public const string Hour = "hour";
        public const string Minutes = "minutes";
    }
    
    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var time = new TimeOnly(0, 0);

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.PropertyName)
            {
                var propertyName = reader.GetString();
                reader.Read();

                switch (propertyName)
                {
                    case TimeParameter.Hour:
                        time.AddHours(reader.GetInt32());
                        break;
                    case TimeParameter.Minutes:
                        time.AddMinutes(reader.GetInt32());
                        break;
                }
            }
        }
        
        return time;
    }

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        
        writer.WriteNumber(TimeParameter.Hour, value.Hour);
        writer.WriteNumber(TimeParameter.Minutes, value.Minute);
        
        writer.WriteEndObject();
    }
    
}