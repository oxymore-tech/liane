using System;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Util.Sql;

public static class PaginationExtensions
{
  public static Filter<T> ToFilter<T>(this Pagination pagination) where T : IEntity<Guid> =>
    pagination.ToFilter<T, Guid>(Guid.Parse);

  public static Filter<T> ToFilter<T, TId>(this Pagination pagination, Func<string, TId> convertId) where T : IEntity<TId>
  {
    var op = pagination.SortAsc ? ComparisonOperator.Gt : ComparisonOperator.Lte;
    return pagination.Cursor switch
    {
      Cursor.Natural n => Filter<T>.Where(e => e.Id, op, convertId(n.Id)),
      Cursor.Time t => Filter<T>.Where(e => e.CreatedAt, op, t.Timestamp)
                       & (t.Id.GetOrDefault(id => Filter<T>.Where(e => e.Id, op, convertId(id))) ?? Filter<T>.Empty),
      _ => Filter<T>.Empty
    };
  }
}