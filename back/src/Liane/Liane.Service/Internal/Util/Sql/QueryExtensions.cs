using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Dapper;
using GeoJSON.Text.Feature;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Util.Sql;

public static class QueryExtensions
{
  public static Task<ImmutableList<T>> QueryAsync<T>(this IDbConnection connection, IQuery<T> query, IDbTransaction? transaction = null) =>
    QueryAsync<T>(connection, (IQuery)query, transaction);

  public static async Task<ImmutableList<T>> QueryAsync<T>(this IDbConnection connection, IQuery query, IDbTransaction? transaction = null) =>
    (await QueryAsyncInternal<T>(connection, query, transaction)).ToImmutableList();

  public static Task<T> QuerySingleAsync<T>(this IDbConnection connection, IQuery query, IDbTransaction? transaction = null)
  {
    var (sql, parameters) = query.ToSql();
    return connection.QuerySingleAsync<T>(sql, parameters, transaction);
  }

  public static async Task<T> GetAsync<T>(this IDbConnection connection, Ref<T> reference, IDbTransaction? transaction = null) where T : class, IIdentity<string>
  {
    return await FirstOrDefaultAsync<T, string>(connection, reference.Id, transaction) ?? throw ResourceNotFoundException.For(reference);
  }

  public static async Task<T> GetAsync<T>(this IDbConnection connection, Guid id, IDbTransaction? transaction = null) where T : class, IIdentity<Guid>
  {
    return await FirstOrDefaultAsync<T, Guid>(connection, id, transaction) ?? throw ResourceNotFoundException.For<T, Guid>(id);
  }

  public static async Task<T> GetAsync<T, TId>(this IDbConnection connection, TId id, IDbTransaction? transaction = null) where T : class, IIdentity<TId>
  {
    return await FirstOrDefaultAsync<T, TId>(connection, id, transaction) ?? throw ResourceNotFoundException.For<T, TId>(id);
  }

  public static Task<T?> FirstOrDefaultAsync<T, TId>(this IDbConnection connection, TId id, IDbTransaction? transaction = null) where T : class, IIdentity<TId>
  {
    var query = Query.Select<T>()
      .Where(Filter<T>.Where(r => r.Id, ComparisonOperator.Eq, id));
    return FirstOrDefaultAsync(connection, query, transaction);
  }

  public static async Task<T?> FirstOrDefaultAsync<T>(this IDbConnection connection, SelectQuery<T> selectQuery, IDbTransaction? transaction = null)
  {
    var results = await QueryAsync(connection, selectQuery.Take(1), transaction);
    return results.FirstOrDefault();
  }

  public static Task<int> UpdateAsync<T>(this IDbConnection connection, T table, IDbTransaction? transaction = null) where T : IIdentity
  {
    var setters = Mapper.GetProperties<T>()
      .Where(p => p.Name != nameof(IIdentity.Id))
      .ToImmutableDictionary(p => (FieldDefinition<T>)p.Name, p => p.GetValue(table));

    var query = Query.Update<T>();
    foreach (var setter in setters.AsEnumerable())
    {
      query = query.Set(setter.Key, setter.Value);
    }

    query = query.Where(Filter<T>.Where(r => r.Id, ComparisonOperator.Eq, table.Id));

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

  public static Task<TId> InsertAsync<T, TId>(this IDbConnection connection, InsertQuery<T, TId> query, IDbTransaction? transaction = null) where T : notnull
  {
    var (sql, parameters) = query.ToSql();
    return connection.QuerySingleAsync<TId>(sql, parameters, transaction);
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

  private static Task<IEnumerable<T>> QueryAsyncInternal<T>(this IDbConnection connection, IQuery query, IDbTransaction? transaction = null)
  {
    var (sql, parameters) = query.ToSql();
    return connection.QueryAsync<T>(sql, parameters, transaction);
  }

  public static Task<long> CountAsync<T>(this IDbConnection connection, IQuery<T> query, IDbTransaction? transaction = null)
  {
    var (sql, parameters) = query.ToSql();
    return CountAsync(connection, sql, parameters, transaction);
  }

  public static Task<long> CountAsync(this IDbConnection connection, string sql, object? parameters, IDbTransaction? transaction = null)
  {
    return connection.QuerySingleAsync<long>(sql, parameters, transaction);
  }

  public static async Task<FeatureCollection> QueryGeoJsonAsync<T>(this IDbConnection connection, IQuery<T> query, IDbTransaction? transaction = null)
  {
    var (sql, parameters) = query.ToSql();
    sql = $"SELECT json_build_object('type', 'FeatureCollection','features', coalesce(json_agg(ST_AsGeoJSON(t.*)::json), '[]'::json)) FROM ({sql}) AS t";
    var strResult = await connection.QuerySingleAsync<string>(sql, parameters, transaction);
    var result = JsonSerializer.Deserialize<FeatureCollection>(strResult) ?? new FeatureCollection();
    var transformedFeatures = result.Features.Select(f =>
    {
      return new Feature(f.Geometry, f.Properties.Select(entry => (entry.Key.NormalizeToCamelCase(), entry.Value))
        .ToImmutableDictionary(entry => entry.Item1, entry => entry.Item2), f.Id);
    });
    return new FeatureCollection(transformedFeatures.ToList());
  }
}