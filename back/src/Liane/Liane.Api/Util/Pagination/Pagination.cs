namespace Liane.Api.Util.Pagination;

public sealed record Pagination<TCursor>(
  TCursor? Cursor = null,
  int Limit = 15
) where TCursor : class;