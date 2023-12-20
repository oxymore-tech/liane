using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Liane.Service.Internal.Util.Sql;

public sealed record UpdateQuery<T>(Filter<T> Filter) : IQuery<T>
{
  private IDictionary<FieldDefinition<T>, object?> setters = new Dictionary<FieldDefinition<T>, object?>();
  private IDictionary<FieldDefinition<T>, int> increment = new Dictionary<FieldDefinition<T>, int>();
  public UpdateQuery<T> Set<TValue>(Expression<Func<T, TValue>> field, TValue value)
  {
    setters.Add(FieldDefinition<T>.From(field), value);
    return this;
  }
  
  public UpdateQuery<T> Set<TValue>(FieldDefinition<T> field, TValue value)
  {
    setters.Add(field, value);
    return this;
  }
  
  public UpdateQuery<T> Increment<TValue>(Expression<Func<T, TValue>> field, int value = 1)
  {
    increment.Add(FieldDefinition<T>.From(field), value);
    return this;
  }

  public (string Sql, object? Params) ToSql()
  {
    var namedParams = new NamedParams();
    var sqlFilter = Filter.ToSql(namedParams);

    var stringBuilder = new StringBuilder();
    stringBuilder.Append($"UPDATE {Mapper.GetTableName<T>()}");
    if (setters.IsNullOrEmpty() && increment.IsNullOrEmpty())
    {
      throw new ArgumentException("No Setters defined");
    }

    stringBuilder.Append($"\nSET {string.Join(", ", setters.Select(kv => $"{kv.Key.ToSql(namedParams)} = {namedParams.Add(kv.Value)}"))}");
    if (!setters.IsNullOrEmpty() && !increment.IsNullOrEmpty()) stringBuilder.Append(", ");
    stringBuilder.Append(string.Join(", ", increment.Select(kv => $"{kv.Key.ToSql(namedParams)} = {kv.Key.ToSql(namedParams)} + {namedParams.Add(kv.Value)}")));
    if (!string.IsNullOrEmpty(sqlFilter))
    {
      stringBuilder.Append($"\nWHERE {sqlFilter}");
    }

    return (stringBuilder.ToString(), namedParams.ToSqlParameters());
  }

  public UpdateQuery<T> Where(Filter<T> filter) => this with { Filter = Filter & filter };
}