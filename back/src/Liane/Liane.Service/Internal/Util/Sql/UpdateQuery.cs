using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Liane.Service.Internal.Util.Sql;

public sealed record UpdateQuery<T>(Filter<T> Filter, IDictionary<FieldDefinition<T>, object?> Setters) : IQuery<T>
{
  public UpdateQuery<T> Set(IDictionary<FieldDefinition<T>, object?> setters) => this with { Setters = setters };

  public UpdateQuery<T> Set<TValue>(Expression<Func<T, TValue>> field, TValue value)
  {
    Setters.Add(FieldDefinition<T>.From(field), value);
    return this;
  }

  public (string Sql, object? Params) ToSql()
  {
    var namedParams = new NamedParams();
    var sqlFilter = Filter.ToSql(namedParams);

    var stringBuilder = new StringBuilder();
    stringBuilder.Append($"UPDATE {Mapper.GetTableName<T>()} ");
    if (Setters.IsNullOrEmpty())
    {
      throw new ArgumentException("No Setters defined");
    }

    stringBuilder.Append($"SET {string.Join(", ", Setters.Select(kv => $"{kv.Key.ToSql(namedParams)} = {namedParams.Add(kv.Value)}"))}");

    if (!string.IsNullOrEmpty(sqlFilter))
    {
      stringBuilder.Append($"\nWHERE {sqlFilter}");
    }

    return (stringBuilder.ToString(), namedParams.ToSqlParameters());
  }

  public UpdateQuery<T> Where<TValue>(Expression<Func<T, TValue>> field, ComparisonOperator op, TValue operand) => Where(Filter<T>.Where(field, op, operand));
  public UpdateQuery<T> Where(Filter<T> filter) => this with { Filter = Filter & filter };

  public UpdateQuery<T> And(Filter<T> other) => this with { Filter = Filter & other };
  public UpdateQuery<T> And(Expression<Func<T, object?>> field, ComparisonOperator op, object? operand) => And(Filter<T>.Where(field, op, operand));

  public UpdateQuery<T> Or(Filter<T> other) => this with { Filter = Filter | other };
  public UpdateQuery<T> Or(Expression<Func<T, object?>> field, ComparisonOperator op, object? operand) => Or(Filter<T>.Where(field, op, operand));
}