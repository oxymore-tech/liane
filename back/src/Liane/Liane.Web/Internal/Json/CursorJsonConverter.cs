using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Util.Pagination;

namespace Liane.Web.Internal.Json;

internal sealed class CursorJsonConverter : JsonConverter<Cursor>
{
  public override Cursor Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    return reader.GetString()!;
  }

  public override void Write(Utf8JsonWriter writer, Cursor value, JsonSerializerOptions options)
  {
    writer.WriteStringValue(value.ToString());
  }
}