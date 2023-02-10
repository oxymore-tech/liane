using System;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo;

public sealed class DatetimePagination<TData> where TData : class, IIdentity
{
  public static async Task<PaginatedResponse<TData, DatetimeCursor>> List(
    IMongoDatabase mongo,
    Pagination<DatetimeCursor> pagination,
    Expression<Func<TData, object>> indexedField,
    FilterDefinition<TData> baseFilter,
    bool sortAsc = true
  )
  {
    var sort = sortAsc
      ? Builders<TData>.Sort.Ascending(indexedField).Ascending(m => m.Id)
      : Builders<TData>.Sort.Descending(indexedField).Descending(m => m.Id);

    var collection = mongo.GetCollection<TData>();
    var filter = (pagination.Cursor != null) ? CreatePaginationFilter(pagination.Cursor, sortAsc, indexedField) : FilterDefinition<TData>.Empty;

    filter = Builders<TData>.Filter.And(baseFilter, filter);

    // Check if collection has next page by selecting one more entry
    var findFluent = collection.Find(filter)
      .Sort(sort)
      .Limit(pagination.Limit + 1);
    var total = await findFluent.CountDocumentsAsync();
    var result = await findFluent.ToListAsync();

    var hasNext = result.Count > pagination.Limit;
    var count = Math.Min(result.Count, pagination.Limit);
    var data = result.GetRange(0, count);
    DatetimeCursor? cursor = null;
    if (hasNext)
    {
      var last = data.Last();
      cursor = hasNext ? new DatetimeCursor((DateTime)indexedField.Compile().Invoke(last), last.Id) : null;
    }

    return new PaginatedResponse<TData, DatetimeCursor>(count, cursor, data.ToImmutableList(), (int)total);
  }

  private static FilterDefinition<TData> CreatePaginationFilter(DatetimeCursor cursor, bool sortAsc, Expression<Func<TData, object>> indexedField)
  {
    Func<Expression<Func<TData, object>>, object, FilterDefinition<TData>> filterFn = sortAsc ? Builders<TData>.Filter.Gt : Builders<TData>.Filter.Lt;
    // Select messages created before given cursor Timestamp
    var filter = filterFn(indexedField, cursor.Timestamp);
    if (cursor.Id != null)
    {
      // If Id is provided, filter Id index
      filter = Builders<TData>.Filter.Or(filter,
        Builders<TData>.Filter.And(
          Builders<TData>.Filter.Eq(indexedField, cursor.Timestamp),
          filterFn(d => d.Id!, cursor.Id)
        )
      );
    }

    return filter;
  }
}