using System.Linq;
using System.Text;

namespace Liane.Service.Internal.Util.Sql;

public sealed record InsertQuery<T>(object Parameters, bool IgnoreConflicts = true) : IQuery<T>
{
  public InsertQuery<T> SetIgnoreConflicts(bool ignoreConflicts) => this with { IgnoreConflicts = ignoreConflicts };

  public (string Sql, object? Params) ToSql()
  {
    var columns = Mapper.GetColumns<T>();
    var stringBuilder = new StringBuilder();
    stringBuilder.Append($"INSERT INTO {Mapper.GetTableName<T>()} ");

    stringBuilder.Append($"({string.Join(", ", columns.Select(c => c.ColumnName))}) VALUES ({string.Join(", ", columns.Select(c => $"@{c.PropertyInfo.Name}"))})");

    if (IgnoreConflicts)
    {
      stringBuilder.Append(" ON CONFLICT DO NOTHING");
    }

    return (stringBuilder.ToString(), Parameters);
  }
}