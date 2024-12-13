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

  public static async Task<T?> Get<T>(this IMongoDatabase mongo, string id) where T : class, IIdentity<string>
  {
    return await mongo.GetCollection<T>()
      .Find(p => p.Id == id)
      .FirstOrDefaultAsync();
  }

  public static Task<PaginatedResponse<TData>> PaginateTime<TData>(
    this IMongoCollection<TData> collection,
    Pagination pagination,
    Expression<Func<TData, object?>> paginationField,
    FilterDefinition<TData>? baseFilter = null,
    bool? sortAsc = null,
    CancellationToken cancellationToken = default
  ) where TData : IIdentity
  {
    return Paginate<TData, Cursor.Time, TData>(
      collection,
      pagination,
      ImmutableList.Create(paginationField),
      t => t.Match(baseFilter ?? Builders<TData>.Filter.Empty),
      sortAsc,
      cancellationToken);
  }

  public static Task<PaginatedResponse<TProjection>> PaginateTime<TData, TProjection>(
    this IMongoCollection<TData> collection,
    Pagination pagination,
    Expression<Func<TProjection, object?>> paginationField,
    Func<IAggregateFluent<TData>, IAggregateFluent<TProjection>> pipeline,
    bool? sortAsc = null,
    CancellationToken cancellationToken = default
  ) where TData : IIdentity where TProjection : IIdentity
  {
    return Paginate<TData, Cursor.Time, TProjection>(
      collection,
      pagination,
      ImmutableList.Create(paginationField),
      pipeline,
      sortAsc,
      cancellationToken);
  }

  public static Task<PaginatedResponse<TData>> PaginateNatural<TData>(
    this IMongoCollection<TData> collection,
    Pagination pagination,
    FilterDefinition<TData>? baseFilter = null,
    bool? sortAsc = null,
    CancellationToken cancellationToken = default
  ) where TData : IIdentity
  {
    return Paginate<TData, Cursor.Natural, TData>(
      collection,
      pagination,
      ImmutableList<Expression<Func<TData, object?>>>.Empty,
      t => t.Match(baseFilter ?? Builders<TData>.Filter.Empty),
      sortAsc,
      cancellationToken);
  }

  private static async Task<PaginatedResponse<TProjection>> Paginate<TData, TCursor, TProjection>(
    this IMongoCollection<TData> collection,
    Pagination pagination,
    ImmutableList<Expression<Func<TProjection, object?>>> paginationFields,
    Func<IAggregateFluent<TData>, IAggregateFluent<TProjection>> pipeline,
    bool? sortAsc = null,
    CancellationToken cancellationToken = default
  ) where TData : IIdentity where TProjection : IIdentity where TCursor : Cursor
  {
    var effectiveSortAsc = sortAsc ?? pagination.SortAsc;

    paginationFields = paginationFields.Append(m => m.Id).ToImmutableList();

    // Sort entities by given pagination fields
    var sort = Builders<TProjection>.Sort.Combine(
      paginationFields.Select(f => effectiveSortAsc
        ? Builders<TProjection>.Sort.Ascending(f)
        : Builders<TProjection>.Sort.Descending(f))
    );

    // Get pagination fields in order then build filter 
    // In the case of ascending sort with two fields, the final filter is built in the following way :
    //    field1 >= value1 || (field1 == value1 && field2 >= value2) 
    var filterFields = pagination.Cursor?.GetFilterFields().Select(
      (value, index) => value is null ? null : GetFieldFilter(effectiveSortAsc, paginationFields[index], value)).Where(f => f is not null).ToList();


    var filter = FilterDefinition<TProjection>.Empty;
    if (filterFields is not null)
    {
      for (int i = 0; i < filterFields.Count; i++)
      {
        filterFields[i] = Builders<TProjection>.Filter.And(
          pagination.Cursor!.GetFilterFields().Take(i).Select((value, index) => Builders<TProjection>.Filter.Eq(paginationFields[index], value))
            .Append(filterFields[i])
        );
      }

      filter = Builders<TProjection>.Filter.Or(filterFields);
    }

    // Check if collection has next page by selecting one more entry
    var agg = pipeline(collection.Aggregate()).Match(filter).Sort(sort)
      .Limit(pagination.Limit + 1);
    var result = await agg.ToListAsync(cancellationToken: cancellationToken);

    var hasNext = result.Count > pagination.Limit;
    var count = Math.Min(result.Count, pagination.Limit);
    var data = result.GetRange(0, count);
    var cursor = hasNext ? Cursor.From<TCursor>(paginationFields.Select(f => f.Compile()(result.Last()))) : null;
    return new PaginatedResponse<TProjection>(count, cursor, data.Take(pagination.Limit).ToImmutableList());
  }

  private static FilterDefinition<T> GetFieldFilter<T>(bool sortAsc, Expression<Func<T, object?>> paginationField, object value)
  {
    return sortAsc ? Builders<T>.Filter.Gte(paginationField, value) : Builders<T>.Filter.Lte(paginationField, value);
  }

  public static async Task<ImmutableList<TOut>> Select<T, TOut>(this IAsyncCursorSource<T> source, Func<T, TOut> transformer, bool parallel = false, CancellationToken cancellationToken = default)
  {
    return await (await source.ToListAsync(cancellationToken))
      .SelectAsync(t => Task.FromResult(transformer(t)), parallel);
  }

  public static async Task<ImmutableList<TOut>> SelectAsync<T, TOut>(this IAsyncCursorSource<T> source, Func<T, Task<TOut>> transformer, bool parallel = false,
    CancellationToken cancellationToken = default)
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

  public static IAggregateFluent<BsonDocument> Lookup<T, TForeignCollection>(this IAggregateFluent<T> aggregate, string alias) where T : IIdentity where TForeignCollection : IIdentity
  {
    var name = GetCollectionName<TForeignCollection>();
    return aggregate.Lookup(name, "_id", "_id", alias);
  }

  public static IAggregateFluent<BsonDocument> JoinOneToOne<T, TForeignCollection>(this IAggregateFluent<T> aggregate, string alias) where T : IIdentity where TForeignCollection : IIdentity
  {
    return aggregate.Lookup<T, TForeignCollection>(alias)
      .AppendStage<BsonDocument>(new BsonDocument("$set",
        new BsonDocument(alias,
          new BsonDocument("$first", "$" + alias))));
  }
}