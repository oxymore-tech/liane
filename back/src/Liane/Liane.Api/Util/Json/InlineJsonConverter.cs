using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Liane.Api.Util.Json
{
    public sealed class InlineJsonConverter : JsonConverter
    {
        public override void WriteJson(JsonWriter writer, object? value, JsonSerializer serializer)
        {
            if (value == null)
            {
                writer.WriteNull();
            }
            else
            {
                var propertyInfo = value.GetType().GetProperties()[0];
                writer.WriteValue(propertyInfo.GetValue(value));
            }
        }

        public override object ReadJson(JsonReader reader, Type objectType, object? existingValue,
            JsonSerializer serializer)
        {
            var propertyInfo = objectType.GetProperties()[0];
            var value = JToken.Load(reader).ToObject(propertyInfo.PropertyType);
            var constructorInfo = objectType.GetConstructor(new[] {propertyInfo.PropertyType});
            if (constructorInfo == null)
                throw new JsonException(
                    $"Type {objectType} must have a constructor with argument of type {propertyInfo.PropertyType} to be read by InlineJsonConverter");

            return constructorInfo.Invoke(new[] {value});
        }

        public override bool CanConvert(Type objectType)
        {
            return objectType.GetProperties().Length == 1;
        }
    }
}