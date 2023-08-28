using System;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Liane.Service.Internal.Util.Sql;

public sealed record SelectQuery<T>(Filter<T> Filter, int? InternalTakeValue, int? InternalSkipValue, ImmutableList<FieldDefinition<T>> InternalOrderBy) : IQuery<T>
{
  public SelectQuery<T> And(Filter<T> other) => this with { Filter = Filter & other };
  public SelectQuery<T> Or(Filter<T> other) => this with { Filter = Filter | other };

  public (string Sql, object? Params) ToSql()
  {
    var namedParams = new NamedParams();
    var sqlFilter = Filter.ToSql(namedParams);

    var stringBuilder = new StringBuilder();
    stringBuilder.Append($"SELECT * FROM {Mapper.GetTableName<T>()}");

    if (!string.IsNullOrEmpty(sqlFilter))
    {
      stringBuilder.Append($"\nWHERE {sqlFilter}");
    }

    if (!InternalOrderBy.IsNullOrEmpty())
    {
      var orderBy = string.Join(", ", InternalOrderBy.Select(f => f.ToSql(namedParams)));
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

  public SelectQuery<T> Take(int? take) => this with { InternalTakeValue = take };
  public SelectQuery<T> Skip(int? skip) => this with { InternalSkipValue = skip };

  public SelectQuery<T> OrderBy(FieldDefinition<T> fieldDefinition) => this with { InternalOrderBy = InternalOrderBy.Add(fieldDefinition) };
  public SelectQuery<T> OrderBy(Expression<Func<T, object?>> expression) => this with { InternalOrderBy = InternalOrderBy.Add(FieldDefinition<T>.From(expression)) };
}