using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;

namespace Liane.Service.Internal.Util.Sql;

public interface IQuery
{
  (string Sql, object? Params) ToSql();
}

// ReSharper disable once UnusedTypeParameter
public interface IQuery<T> : IQuery;

public sealed class Query
{
  public static SelectQuery<T> Select<T>() where T : notnull =>
    new(Mapper.GetColumns<T>(), Filter<T>.Empty, null, null, ImmutableList<SortDefinition<T>>.Empty);

  public static SelectQuery<T> Select<T>(Expression<Func<T, object?>> select, params Expression<Func<T, object?>>[] others) where T : notnull =>
    new(ImmutableList.Create((FieldDefinition<T>)select).Concat(others.Select(o => (FieldDefinition<T>)o)).ToImmutableList(), Filter<T>.Empty, null, null, ImmutableList<SortDefinition<T>>.Empty);

  public static SelectQuery<T> Count<T>() where T : notnull =>
    new(ImmutableList.Create<FieldDefinition<T>>(new FieldDefinition<T>.Expr("count(*)")), Filter<T>.Empty, null, null, ImmutableList<SortDefinition<T>>.Empty);

  public static UpdateQuery<T> Update<T>() where T : notnull => new(Filter<T>.Empty);
  public static InsertQuery<T, int> Insert<T>(T entity) where T : notnull => new(entity, new OnConflict.DoNothing());
  public static InsertQuery<T, int> Insert<T>(IEnumerable<T> entities) where T : notnull => new(entities, new OnConflict.DoNothing());
  public static DeleteQuery<T> Delete<T>(Filter<T> where) where T : notnull => new(where);
}