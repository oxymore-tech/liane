using System;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Liane.Api.Event;
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
    return new BsonDocument(PolymorphicTypeDiscriminatorConvention.Type, typeof(TExpected).Name);
  }

  public static FilterDefinition<T> IsInstanceOf<T, TExpected>(this FilterDefinitionBuilder<T> builder, Expression<Func<T, object?>> field)
    where T : class
    where TExpected : class
  {
    var prefix = string.Join(".", ExpressionHelper.GetMembers(field)
      .Select(m => m.Name.Uncapitalize())
      .Reverse());
    return new BsonDocument($"{prefix}.{PolymorphicTypeDiscriminatorConvention.Type}", typeof(TExpected).Name);
  }

  public static FilterDefinition<T> IsInstanceOf<T, TTargetType>(this FilterDefinitionBuilder<T> builder, Expression<Func<T, object?>> field, ITypeOf<TTargetType> typeOf)
    where T : class
    where TTargetType : class
  {
    return typeOf.Type == typeof(TTargetType)
      ? Builders<T>.Filter.Empty
      : IsInstanceOf(builder, field, typeOf.Type);
  }

  public static FilterDefinition<T> IsInstanceOf<T>(this FilterDefinitionBuilder<T> builder, Expression<Func<T, object?>> field, Type targetType)
    where T : class
  {
    var prefix = string.Join(".", ExpressionHelper.GetMembers(field)
      .Select(m => m.Name.Uncapitalize())
      .Reverse());
    return new BsonDocument($"{prefix}.{PolymorphicTypeDiscriminatorConvention.Type}", targetType.Name);
  }

  public static async Task<T?> Get<T>(this IMongoDatabase mongo, string id) where T : class, IIdentity
  {
    return await mongo.GetCollection<T>()
      .Find(p => p.Id == id)
      .FirstOrDefaultAsync();
  }

  public static async Task<PaginatedResponse<TData>> Paginate<TData>(
    this IMongoDatabase mongo,
    Pagination pagination,
    Expression<Func<TData, object?>> paginationField,
    FilterDefinition<TData> baseFilter,
    bool? sortAsc = null
  ) where TData : IIdentity
  {
    var effectiveSortAsc = sortAsc ?? pagination.SortAsc;
    var sort = effectiveSortAsc
      ? Builders<TData>.Sort.Ascending(paginationField).Ascending(m => m.Id)
      : Builders<TData>.Sort.Descending(paginationField).Descending(m => m.Id);

    var collection = mongo.GetCollection<TData>();
    var filter = pagination.Cursor != null ? CreatePaginationFilter(pagination.Cursor, effectiveSortAsc, paginationField) : FilterDefinition<TData>.Empty;

    filter = Builders<TData>.Filter.And(baseFilter, filter);

    // Check if collection has next page by selecting one more entry
    var find = collection.Find(filter)
      .Sort(sort)
      .Limit(pagination.Limit + 1);
    var total = await find.CountDocumentsAsync();
    var result = await find.ToListAsync();

    var hasNext = result.Count > pagination.Limit;
    var count = Math.Min(result.Count, pagination.Limit);
    var data = result.GetRange(0, count);
    var cursor = hasNext ? pagination.Cursor?.From(data.Last(), paginationField) : null;
    return new PaginatedResponse<TData>(count, cursor, data.ToImmutableList(), (int)total);
  }

  private static FilterDefinition<TData> CreatePaginationFilter<TData>(Cursor cursor, bool sortAsc, Expression<Func<TData, object?>> indexedField)
    where TData : IIdentity
  {
    return cursor.ToFilter(sortAsc, indexedField);
  }

  public static async Task<ImmutableList<TOut>> SelectAsync<T, TOut>(this IAsyncCursorSource<T> source, Func<T, Task<TOut>> transformer, bool parallel = false)
  {
    return await (await source.ToListAsync())
      .SelectAsync(transformer, parallel);
  }

  public static IMongoCollection<T> GetCollection<T>(this IMongoDatabase mongoDatabase)
  {
    var collectionName = GetCollectionName<T>();
    return mongoDatabase.GetCollection<T>(collectionName.ToSnakeCase());
  }

  public static string GetCollectionName<T>()
  {
    var collectionName = typeof(T).Name.Replace("Db", "", StringComparison.OrdinalIgnoreCase);
    return collectionName.ToSnakeCase();
  }
}