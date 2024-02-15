using System.Collections.Generic;
using System.Collections.Immutable;

namespace Liane.Service.Internal.Util.Sql;

// ReSharper disable once UnusedTypeParameter
public interface IQuery<T>
{
  (string Sql, object? Params) ToSql();
}

public sealed class Query
{
  public static SelectQuery<T> Select<T>() where T : notnull =>
    new(Filter<T>.Empty, null, null, ImmutableList<FieldDefinition<T>>.Empty);

  public static UpdateQuery<T> Update<T>() where T : notnull => new(Filter<T>.Empty, ImmutableDictionary<FieldDefinition<T>, object?>.Empty);
  public static InsertQuery<T, int> Insert<T>(T entity) where T : notnull => new(entity, new OnConflict.DoNothing());
  public static InsertQuery<T, int> Insert<T>(IEnumerable<T> entities) where T : notnull => new(entities, new OnConflict.DoNothing());
  public static DeleteQuery<T> Delete<T>(Filter<T> where) where T : notnull => new(where);
}