using Liane.Api.Util;

namespace Liane.Service.Internal.Util.Sql;

public static class Mapper
{
  public static string GetTableName<T>()
  {
    var snakeCase = typeof(T).Name.ToSnakeCase();
    if (snakeCase.EndsWith("_db"))
    {
      snakeCase = snakeCase[..^3];
    }

    return snakeCase;
  }

  public static string GetColumnName(string property) => property.ToSnakeCase();
}