using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Util.Sql;

public static class FilterExtensions
{
  public static Filter<T> ToFilter<T>(this Cursor? cursor) where T : IEntity
  {
    return cursor switch
    {
      Cursor.Natural n => Filter<T>.Where(e => e.Id, ComparisonOperator.Gt, n.Id),
      Cursor.Time t => Filter<T>.Where(e => e.CreatedAt, ComparisonOperator.Gt, t.Timestamp)
                       & Filter<T>.Where(e => e.Id, ComparisonOperator.Gt, t.Id),
      _ => Filter<T>.Empty
    };
  }
}