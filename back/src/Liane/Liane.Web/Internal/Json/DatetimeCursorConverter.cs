using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Api.Util.Pagination;

namespace Liane.Web.Internal.Json;

public sealed class DatetimeCursorConverter : JsonConverter<DatetimeCursor>
{
  public override DatetimeCursor? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
  {
    return (DatetimeCursor?)reader.GetString();
  }

  public override void Write(Utf8JsonWriter writer, DatetimeCursor value, JsonSerializerOptions options)
  {
    writer.WriteStringValue(value.ToString());
  }
}