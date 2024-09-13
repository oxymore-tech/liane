using System;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Text;

namespace Liane.Service.Internal.Util.Sql;

public abstract record OnConflict
{
  private OnConflict()
  {
  }

  public sealed record DoNothing : OnConflict;

  public sealed record Update<T>(params FieldDefinition<T>[] UpdateFields) : OnConflict;
}

public record InsertQuery<T, TId>(object Parameters, OnConflict? OnConflict = null, FieldDefinition<T>? ReturningId = null) : IQuery<T>
{
  public InsertQuery<T, TId> IgnoreOnConflict(params Expression<Func<T, object?>>[] onConflict) => this with { OnConflict = new OnConflict.DoNothing() };

  public InsertQuery<T, TId> UpdateOnConflict(params Expression<Func<T, object?>>[] onConflict) =>
    this with { OnConflict = new OnConflict.Update<T>(onConflict.Select(c => (FieldDefinition<T>)c).ToArray()) };

  public InsertQuery<T, TId> DoNothingOnConflict() => this with { OnConflict = new OnConflict.DoNothing() };

  public InsertQuery<T, TOutput> ReturnsId<TOutput>(Expression<Func<T, TOutput?>> returningId) => new(Parameters, OnConflict, FieldDefinition<T>.From(returningId));

  public (string Sql, object? Params) ToSql()
  {
    var columns = Mapper.GetColumns<T>();
    var stringBuilder = new StringBuilder();
    stringBuilder.Append($"INSERT INTO {Mapper.GetTableName<T>()} ");

    stringBuilder.Append($"({string.Join(", ", columns.Select(c => c.ToSql(null!)))}) VALUES ({string.Join(", ", columns.Select(c => $"@{c.RawSql}"))})");

    switch (OnConflict)
    {
      case OnConflict.DoNothing:
        stringBuilder.Append(" ON CONFLICT DO NOTHING");
        break;
      case OnConflict.Update<T> update:
      {
        var indexFields = update.UpdateFields.Select(f => f.ToSql(null!))
          .ToImmutableHashSet();
        var excludedFields = indexFields;
        if (ReturningId is not null)
        {
          excludedFields = excludedFields.Add(ReturningId.ToSql(null!));
        }

        var updateFields = string.Join(", ", columns.Select(c => c.ToSql(null!)).Where(c => !excludedFields.Contains(c)).Select(c => $"{c} = EXCLUDED.{c}"));

        stringBuilder.Append($" ON CONFLICT({string.Join(", ", indexFields)}) DO UPDATE SET {updateFields}");
        break;
      }
    }

    if (ReturningId is not null)
    {
      stringBuilder.Append($" RETURNING {ReturningId.ToSql(null!)}");
    }

    return (stringBuilder.ToString(), Parameters);
  }
}