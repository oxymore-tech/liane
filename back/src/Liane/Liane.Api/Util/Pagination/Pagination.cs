namespace Liane.Api.Util.Pagination;

public sealed record Pagination(
  Cursor? Cursor = null,
  int Limit = 15,
  bool SortAsc = true
);
/*
public sealed record LianePagination(
  Cursor? Cursor = null,
  int Limit = 15,
  bool SortAsc = true
) : Pagination(Cursor,Limit, SortAsc);*/