using System.Text;
using Liane.Api.Util;

namespace Liane.Service.Internal.Util.Sql;

public sealed record DeleteQuery<T>(Filter<T> Filter) : IQuery<T>
{
  public (string Sql, object? Params) ToSql()
  {
    var namedParams = new NamedParams();
    var sqlFilter = Filter.ToSql(namedParams);

    var stringBuilder = new StringBuilder();
    stringBuilder.Append($"DELETE FROM {Mapper.GetTableName<T>()}");

    if (!string.IsNullOrEmpty(sqlFilter))
    {
      stringBuilder.Append($"\nWHERE {sqlFilter}");
    }

    return (stringBuilder.ToString(), namedParams.ToSqlParameters());
  }

  public DeleteQuery<T> Where(Filter<T> filter) => new(Filter: Filter & filter);
}