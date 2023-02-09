using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;

namespace Liane.Api.Util.Pagination;

public sealed record PaginatedResponse<TData, TCursor>(
  int PageSize,
  TCursor? NextCursor,
  bool HasNext,
  ImmutableList<TData> Data,
  int? TotalCount = null
)
{
  public PaginatedResponse<TOut, TCursor> ConvertData<TOut>(Func<TData, TOut> transformer)
  {
    return new PaginatedResponse<TOut, TCursor>(PageSize, NextCursor,HasNext, Data.Select(transformer).ToImmutableList(), TotalCount);
  }

  public async Task<PaginatedResponse<TOut, TCursor>> ConvertDataAsync<TOut>(Func<TData, Task<TOut>> transformer)
  {
    var outs = new List<TOut>();
    foreach (var r in Data)
    {
      outs.Add(await transformer(r));
    }

    return new PaginatedResponse<TOut, TCursor>(PageSize, NextCursor,HasNext, outs.ToImmutableList(), TotalCount);
  }
};