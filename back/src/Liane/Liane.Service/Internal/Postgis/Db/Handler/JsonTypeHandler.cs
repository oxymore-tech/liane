using System.Data;
using System.Text.Json;
using Dapper;

namespace Liane.Service.Internal.Postgis.Db.Handler;

public sealed class JsonTypeHandler<T>(JsonSerializerOptions options) : SqlMapper.TypeHandler<T>
{
  public override void SetValue(IDbDataParameter parameter, T? value)
  {
    parameter.Value = JsonSerializer.SerializeToDocument(value, options);
  }

  public override T Parse(object value)
  {
    return JsonSerializer.Deserialize<T>(value.ToString()!, options)!;
  }
}