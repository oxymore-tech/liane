using System;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo.Serialization;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo;

public static class MongoDatabaseExtensions
{
  public static FilterDefinition<T> IsInstanceOf<T, TExpected>(this FilterDefinitionBuilder<T> builder)
    where T : class
    where TExpected : class
  {
    return new BsonDocument(UnionDiscriminatorConvention.Type, typeof(TExpected).Name);
  }

  public static FilterDefinition<T> IsInstanceOf<T, TExpected>(this FilterDefinitionBuilder<T> _, Expression<Func<T, object?>> field)
    where T : class
    where TExpected : class
  {
    var prefix = string.Join(".", ExpressionHelper.GetMembers(field)
      .Select(m => m.Name.Uncapitalize())
      .Reverse());
    return new BsonDocument($"{prefix}.{UnionDiscriminatorConvention.Type}", typeof(TExpected).Name);
  }

  public static FilterDefinition<T> IsInstanceOf<T>(this FilterDefinitionBuilder<T> builder, Expression<Func<T, object?>> fieldExpression, Type targetType)
    where T : class
  {
    var field = string.Join(".", ExpressionHelper.GetMembers(fieldExpression)
      .Select(m => m.Name.Uncapitalize())
      .Reverse());
    return IsInstanceOf(builder, field, targetType);
  }

  public static FilterDefinition<T> IsInstanceOf<T>(this FilterDefinitionBuilder<T> builder, string field, Type targetType)
    where T : class
  {
    return builder.Eq($"{field}.{UnionDiscriminatorConvention.Type}", targetType.Name);
  }

  public static async Task<T?> Get<T>(this IMongoDatabase mongo, string id) where T : class, IIdentity
  {
    return await mongo.GetCollection<T>()
      .Find(p => p.Id == id)
      .FirstOrDefaultAsync();
  }

  public static Task<PaginatedResponse<TData>> Paginate<TData, TCursor>(
    this IMongoDatabase mongo,
    Pagination pagination,
    Expression<Func<TData, object?>> paginationField,
    FilterDefinition<TData> baseFilter,
    bool? sortAsc = null, 
    CancellationToken cancellationToken = default
  ) where TData : IIdentity where TCursor : Cursor
  {
    return Paginate<TData, TCursor, TData>(
      mongo,
      pagination,
      paginationField,
      t=>t.Match(baseFilter), 
      sortAsc,
      cancellationToken);
  }

  public static async Task<PaginatedResponse<TProjection>> Paginate<TData, TCursor, TProjection>(
    this IMongoDatabase mongo,
    Pagination pagination,
    Expression<Func<TProjection, object?>> paginationField,
     Func<IAggregateFluent<TData>, IAggregateFluent<TProjection>> pipeline,
    bool? sortAsc = null, 
    CancellationToken cancellationToken = default
  ) where TData : IIdentity where TProjection : IIdentity where TCursor : Cursor
  {
    var effectiveSortAsc = sortAsc ?? pagination.SortAsc;
    var sort = effectiveSortAsc
      ? Builders<TProjection>.Sort.Ascending(paginationField).Ascending(m => m.Id)
      : Builders<TProjection>.Sort.Descending(paginationField).Descending(m => m.Id);

    var collection = mongo.GetCollection<TData>();
    var filter = pagination.Cursor != null ? CreatePaginationFilter(pagination.Cursor, effectiveSortAsc, paginationField) : FilterDefinition<TProjection>.Empty;

    // Check if collection has next page by selecting one more entry
   
      var agg = pipeline(collection.Aggregate()).Match(filter).Sort(sort)
        .Limit(pagination.Limit+1);
      var result = await agg.ToListAsync(cancellationToken: cancellationToken);

    var hasNext = result.Count > pagination.Limit;
    var count = Math.Min(result.Count, pagination.Limit);
    var data = result.GetRange(0, count);
    var cursor = hasNext ? Cursor.From<TCursor, TProjection>(data.Last(), paginationField) : null;
    return new PaginatedResponse<TProjection>(count, cursor, data.Take(pagination.Limit).ToImmutableList());
  }

  private static FilterDefinition<TData> CreatePaginationFilter<TData>(Cursor cursor, bool sortAsc, Expression<Func<TData, object?>> indexedField)
    where TData : IIdentity
  {
    
    return cursor.ToFilter(sortAsc, indexedField);
  }

  public static async Task<ImmutableList<TOut>> Select<T, TOut>(this IAsyncCursorSource<T> source, Func<T, TOut> transformer, bool parallel = false, CancellationToken cancellationToken = default)
  {
    return await (await source.ToListAsync(cancellationToken))
      .SelectAsync(t => Task.FromResult(transformer(t)), parallel);
  }
  
  public static async Task<ImmutableList<TOut>> SelectAsync<T, TOut>(this IAsyncCursorSource<T> source, Func<T, Task<TOut>> transformer, bool parallel = false, CancellationToken cancellationToken = default)
  {
    return await (await source.ToListAsync(cancellationToken))
      .SelectAsync(transformer, parallel);
  }

  public static IMongoCollection<T> GetCollection<T>(this IMongoDatabase mongoDatabase)
  {
    var collectionName = GetCollectionName<T>();
    return mongoDatabase.GetCollection<T>(collectionName.ToSnakeCase());
  }

  public static string GetCollectionName<T>()
  {
    var collectionName = typeof(T).FullName!.Split(".").Last().Split("+")[0].Replace("Db", "", StringComparison.OrdinalIgnoreCase);
    return collectionName.ToSnakeCase();
  }

  public static IAggregateFluent<BsonDocument> Lookup<T, TForeignCollection>(this IAggregateFluent<T> aggregate,  string alias) where T: IIdentity where TForeignCollection: IIdentity
  {
    var name = GetCollectionName<TForeignCollection>();
    return aggregate.Lookup(name, "_id", "_id", alias);
  }
  
  public static IAggregateFluent<BsonDocument> JoinOneToOne<T, TForeignCollection>(this IAggregateFluent<T> aggregate,  string alias) where T: IIdentity where TForeignCollection: IIdentity
  {
    return aggregate.Lookup<T, TForeignCollection>(alias).AppendStage<BsonDocument>(new BsonDocument("$set",
      new BsonDocument(alias,
        new BsonDocument("$first", "$"+alias))));
  }
}