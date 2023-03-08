using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Notification;

namespace Liane.Web.Internal.Json;

internal sealed class NotificationJsonConverter: JsonConverter<NotificationPayload> 
{
    private const string EventPropertyName = "Event";
    private const string EventTypeDiscriminator = "Type";
    

    public override NotificationPayload Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
      throw new JsonException();
    }

    private static T DeserializeValue<T>(ref Utf8JsonReader reader, JsonSerializerOptions options) where T : class
    {
      var deserialized = JsonSerializer.Deserialize<T>(ref reader, options);
      if (deserialized is null) throw new JsonException();
      return deserialized;
    }
    private static void WriteEventValue<T>(Utf8JsonWriter writer, T eventValue, JsonSerializerOptions options)
    {
      JsonSerializer.Serialize(writer, eventValue, options);
    }

    private static string ConvertName(JsonSerializerOptions options, string name)
    {
      return options.PropertyNamingPolicy is null ? name : options.PropertyNamingPolicy.ConvertName(name);
    }

    public override void Write(Utf8JsonWriter writer, NotificationPayload value, JsonSerializerOptions options)
    {
      var notifType = value.GetType();
      if (!notifType.IsGenericType || notifType.GetGenericTypeDefinition() != typeof(NotificationPayload.WithEvent<>)) throw new JsonException();
      
      writer.WriteStartObject();
      
      // Write base fields
      writer.WritePropertyName(ConvertName(options, nameof(value.Id)));
      writer.WriteStringValue(value.Id);
      writer.WritePropertyName(ConvertName(options, nameof(value.Seen)));
      writer.WriteBooleanValue(value.Seen);
      writer.WritePropertyName(ConvertName(options, nameof(value.CreatedAt)));
      JsonSerializer.Serialize(writer, value.CreatedAt, options);
      
      // Write discriminator type field 
      
     
      var eventType = notifType.GetGenericArguments()[0];
      writer.WritePropertyName(ConvertName(options, EventTypeDiscriminator));
      writer.WriteStringValue(eventType.Name);
      
      // Write event if non null
      var eventValue = notifType.GetProperty(EventPropertyName)?.GetValue(value);
      if (eventValue is not null)
      {
        writer.WritePropertyName(ConvertName(options, EventPropertyName));
        var m = typeof(JsonSerializer).GetMethods(BindingFlags.Static | BindingFlags.NonPublic);
        var serializer = typeof(NotificationJsonConverter).GetMethod(nameof(WriteEventValue), BindingFlags.Static | BindingFlags.NonPublic);
        
        serializer!.MakeGenericMethod(eventType).Invoke(null, new[] { writer, eventValue, options });
      
      }
      writer.WriteEndObject();
     
    }
}