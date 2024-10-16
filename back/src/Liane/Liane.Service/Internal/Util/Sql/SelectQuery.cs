using System;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using Liane.Api.Util;

namespace Liane.Service.Internal.Util.Sql;

public sealed record SelectQuery<T>(
  ImmutableList<FieldDefinition<T>> Select,
  Filter<T> Filter,
  int? InternalTakeValue,
  int? InternalSkipValue,
  ImmutableList<SortDefinition<T>> InternalOrderBy
) : IQuery<T>
{
  public SelectQuery<T> And(Filter<T> other) => this with { Filter = Filter & other };
  public SelectQuery<T> And(Expression<Func<T, object?>> field, ComparisonOperator op, object? operand) => And(Filter<T>.Where(field, op, operand));

  public SelectQuery<T> Or(Filter<T> other) => this with { Filter = Filter | other };
  public SelectQuery<T> Or(Expression<Func<T, object?>> field, ComparisonOperator op, object? operand) => Or(Filter<T>.Where(field, op, operand));

  public (string Sql, object? Params) ToSql()
  {
    var namedParams = new NamedParams();
    var sqlFilter = Filter.ToSql(namedParams);

    var stringBuilder = new StringBuilder();

    stringBuilder.Append("SELECT ");

    stringBuilder.Append(string.Join(", ", Select.Select(c => c.ToSql(namedParams))));

    stringBuilder.Append($" FROM {Mapper.GetTableName<T>()}");

    if (!string.IsNullOrEmpty(sqlFilter))
    {
      stringBuilder.Append($"\nWHERE {sqlFilter}");
    }

    if (!InternalOrderBy.IsNullOrEmpty())
    {
      var orderBy = string.Join(", ", InternalOrderBy.Select(s =>
      {
        var sql = s.FieldDefinition.ToSql(namedParams);
        return s.Asc ? sql : $"{sql} DESC";
      }));
      stringBuilder.Append($"\nORDER BY {orderBy}");
    }

    if (InternalTakeValue is not null)
    {
      stringBuilder.Append($"\nLIMIT {InternalTakeValue}");
    }

    if (InternalSkipValue is not null)
    {
      stringBuilder.Append($"\nOFFSET {InternalSkipValue}");
    }

    return (stringBuilder.ToString(), namedParams.ToSqlParameters());
  }

  public SelectQuery<T> Where(Filter<T> filter) => this with { Filter = Filter & filter };
  public SelectQuery<T> Where(Expression<Func<T, object?>> field, ComparisonOperator op, object? operand) => Where(Filter<T>.Where(field, op, operand));

  public SelectQuery<T> Take(int? take) => this with { InternalTakeValue = take };
  public SelectQuery<T> Skip(int? skip) => this with { InternalSkipValue = skip };

  public SelectQuery<T> OrderBy(FieldDefinition<T> fieldDefinition, bool asc = true) => this with { InternalOrderBy = InternalOrderBy.Add(new SortDefinition<T>(fieldDefinition, asc)) };
  public SelectQuery<T> OrderBy(Expression<Func<T, object?>> expression, bool asc = true) => OrderBy(FieldDefinition<T>.From(expression), asc);
}