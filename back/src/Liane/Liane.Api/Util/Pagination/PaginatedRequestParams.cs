namespace Liane.Api.Util.Pagination;

public record PaginatedRequestParams<TCursor>(
  TCursor? Cursor = null,
  int Limit = 15
  // TODO string Sort = "asc"
) where TCursor : class;