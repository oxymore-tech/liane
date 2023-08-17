using System.Collections.Generic;

namespace Liane.Service.Internal.Util.Sql;

internal sealed class NamedParams
{
  private readonly IDictionary<string, object?> parameters = new Dictionary<string, object?>();
  private readonly IDictionary<object, string> names = new Dictionary<object, string>();

  public string Add(object? value)
  {
    if (value is null)
    {
      return "NULL";
    }

    if (names.TryGetValue(value, out var existingName))
    {
      return existingName;
    }

    var name = $"@param{parameters.Count}";
    names.Add(value, name);
    parameters.Add(name, value);
    return name;
  }

  public IDictionary<string, object?> ToSqlParameters() => parameters;
}