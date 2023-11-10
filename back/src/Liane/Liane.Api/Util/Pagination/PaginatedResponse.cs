using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;

namespace Liane.Api.Util.Pagination;

public sealed record PaginatedResponse<TData>(
  int PageSize,
  Cursor? Next,
  ImmutableList<TData> Data,
  long? TotalCount = null
)
{
  public PaginatedResponse<TOut> Select<TOut>(Func<TData, TOut> transformer)
  {
    return new PaginatedResponse<TOut>(PageSize, Next, Data.Select(transformer).ToImmutableList(), TotalCount);
  }
  
  public PaginatedResponse<TData> Where(Func<TData, bool> filter)
  {
    return new PaginatedResponse<TData>(PageSize, Next, Data.Where(filter).ToImmutableList(), TotalCount);
  }

  public async Task<PaginatedResponse<TOut>> SelectAsync<TOut>(Func<TData, Task<TOut>> transformer)
  {
    var data = await Data.SelectAsync(transformer);
    return new PaginatedResponse<TOut>(PageSize, Next, data, TotalCount);
  }
};