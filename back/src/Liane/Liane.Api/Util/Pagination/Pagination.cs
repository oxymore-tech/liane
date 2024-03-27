namespace Liane.Api.Util.Pagination;

public sealed record Pagination(
  Cursor? Cursor = null,
  int Limit = 15,
  bool SortAsc = true
)
{
  public static Pagination Empty => new();
}