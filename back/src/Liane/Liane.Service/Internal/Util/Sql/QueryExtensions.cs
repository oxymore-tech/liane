using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Util.Sql;

public static class QueryExtensions
{
  public static async Task<ImmutableList<T>> QueryAsync<T>(this IDbConnection connection, IQuery<T> query, IDbTransaction? transaction = null) =>
    (await QueryAsyncInternal(connection, query, transaction)).ToImmutableList();

  public static async Task<T> GetAsync<T>(this IDbConnection connection, Ref<T> reference, IDbTransaction? transaction = null) where T : class, IIdentity
  {
    return await FirstOrDefaultAsync(connection, reference, transaction) ?? throw ResourceNotFoundException.For(reference);
  }

  public static Task<T?> FirstOrDefaultAsync<T>(this IDbConnection connection, Ref<T> reference, IDbTransaction? transaction = null) where T : class, IIdentity
  {
    var query = Query.Select<T>()
      .Where(Filter<T>.Where(r => r.Id, ComparisonOperator.Eq, reference.Id));
    return FirstOrDefaultAsync(connection, query, transaction);
  }

  public static async Task<T?> FirstOrDefaultAsync<T>(this IDbConnection connection, SelectQuery<T> selectQuery, IDbTransaction? transaction = null)
  {
    var results = await QueryAsync(connection, selectQuery.Take(1), transaction);
    return results.FirstOrDefault();
  }

  public static Task<int> UpdateAsync<T>(this IDbConnection connection, T table, IDbTransaction? transaction = null) where T : IIdentity
  {
    var setters = Mapper.GetColumns<T>()
      .Where(p => p.PropertyInfo.Name != nameof(IIdentity.Id))
      .ToImmutableDictionary(p => (FieldDefinition<T>)p.ColumnName, p => p.PropertyInfo.GetValue(table));

    var query = Query.Update<T>()
      .Set(setters)
      .Where(Filter<T>.Where(r => r.Id, ComparisonOperator.Eq, table.Id));

    return connection.UpdateAsync(query, transaction);
  }

  public static Task<int> UpdateAsync<T>(this IDbConnection connection, UpdateQuery<T> query, IDbTransaction? transaction = null)
  {
    var (sql, parameters) = query.ToSql();
    return connection.ExecuteAsync(sql, parameters, transaction);
  }

  public static Task<int> InsertAsync<T>(this IDbConnection connection, T entity, IDbTransaction? transaction = null) where T : notnull
  {
    var insert = Query.Insert(entity);
    var (sql, parameters) = insert.ToSql();
    return connection.ExecuteAsync(sql, parameters, transaction);
  }

  public static Task<int> InsertMultipleAsync<T>(this IDbConnection connection, IEnumerable<T> entities, IDbTransaction? transaction = null) where T : notnull
  {
    var insert = Query.Insert(entities);
    var (sql, parameters) = insert.ToSql();
    return connection.ExecuteAsync(sql, parameters, transaction);
  }

  public static Task<int> DeleteAsync<T>(this IDbConnection connection, Filter<T> filter, IDbTransaction? transaction = null) where T : notnull
  {
    var insert = Query.Delete(filter);
    var (sql, parameters) = insert.ToSql();
    return connection.ExecuteAsync(sql, parameters, transaction);
  }

  private static Task<IEnumerable<T>> QueryAsyncInternal<T>(this IDbConnection connection, IQuery<T> query, IDbTransaction? transaction = null)
  {
    var (sql, parameters) = query.ToSql();
    return connection.QueryAsync<T>(sql, parameters, transaction);
  }
  
  public static Task<long> QueryCountAsync<T>(this IDbConnection connection, IQuery<T> query, IDbTransaction? transaction = null)
  {
    var (sql, parameters) = query.ToSql();
    return connection.QuerySingleAsync<long>($"select count(*) from ({sql}) query", parameters, transaction);
  }
}