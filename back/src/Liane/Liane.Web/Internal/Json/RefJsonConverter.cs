using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Util.Ref;

namespace Liane.Web.Internal.Json;

internal sealed class RefJsonConverter<T> : JsonConverter<Ref<T>> where T : class, IIdentity
{
  public override Ref<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    return reader.TokenType switch
    {
      JsonTokenType.String => reader.GetString()!,
      JsonTokenType.StartObject => JsonSerializer.Deserialize<T>(ref reader, options)!,
      _ => throw new JsonException($"Unexpected token {reader.TokenType} while deserializing Ref")
    };
  }

  public override void Write(Utf8JsonWriter writer, Ref<T> value, JsonSerializerOptions options)
  {
    value.Visit(
      writer.WriteStringValue,
      v => JsonSerializer.Serialize(writer, v, options)
    );
  }

  public override void WriteAsPropertyName(Utf8JsonWriter writer, Ref<T> value, JsonSerializerOptions options)
  {
    writer.WritePropertyName(value.ToString());
  }
}