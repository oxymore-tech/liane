using System.Data;
using System.Text.Json;
using Dapper;

namespace Liane.Service.Internal.Liane;

internal record struct Json<T>(T Value)
{
  public static implicit operator T(Json<T> json) => json.Value;
  public static implicit operator Json<T>(T value) => new(value);
}

internal sealed class JsonTypeHandler<T>(JsonSerializerOptions options) : SqlMapper.TypeHandler<Json<T>>
{
  public override void SetValue(IDbDataParameter parameter, Json<T> value)
  {
    parameter.Value = JsonSerializer.SerializeToDocument(value.Value, options);
  }

  public override Json<T> Parse(object value)
  {
    return JsonSerializer.Deserialize<T>(value.ToString()!, options)!;
  }
}