using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;

namespace Liane.Api.Util.Pagination;

public sealed record PaginatedResponse<TData>(
  int PageSize,
  Cursor? NextCursor,
  ImmutableList<TData> Data,
  int? TotalCount = null
)
{
  public PaginatedResponse<TOut> Select<TOut>(Func<TData, TOut> transformer)
  {
    return new PaginatedResponse<TOut>(PageSize, NextCursor, Data.Select(transformer).ToImmutableList(), TotalCount);
  }

  public async Task<PaginatedResponse<TOut>> SelectAsync<TOut>(Func<TData, Task<TOut>> transformer)
  {
    var data = await Data.SelectAsync(transformer);
    return new PaginatedResponse<TOut>(PageSize, NextCursor, data, TotalCount);
  }
};