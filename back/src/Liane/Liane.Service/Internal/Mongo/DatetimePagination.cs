using System;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo;


public class DatetimePagination<TData> where TData : class, IIdentity
{
  
  private static FilterDefinition<TData> CreatePaginationFilter(DatetimeCursor cursor, bool sortAsc, Expression<Func<TData,object>> indexedField)
  {
    
    Func<Expression<Func<TData,object>>,object, FilterDefinition<TData>> filterFn = sortAsc ? Builders<TData>.Filter.Gt : Builders<TData>.Filter.Lt;
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
  public static async Task<PaginatedResponse<TData, DatetimeCursor>> List(
    IMongoDatabase mongo, 
    PaginatedRequestParams<DatetimeCursor> pagination, 
    Expression<Func<TData,object>> indexedField,
    FilterDefinition<TData> baseFilter, 
    bool sortAsc = true
    )
  {
    var sort = sortAsc ? 
      Builders<TData>.Sort.Ascending(indexedField).Ascending(m => m.Id) 
      : Builders<TData>.Sort.Descending(indexedField).Descending(m => m.Id);
  
    var collection = mongo.GetCollection<TData>();
    var filter = (pagination.Cursor != null) ? CreatePaginationFilter(pagination.Cursor, sortAsc, indexedField) : FilterDefinition<TData>.Empty;
    
    filter = Builders<TData>.Filter.And(baseFilter, filter);
    
    // Check if collection has next page by selecting one more entry
    var result = (await collection.FindAsync(filter, new FindOptions<TData> { Sort = sort, Limit = pagination.Limit + 1 })).ToList();

    var hasNext = result.Count > pagination.Limit;
    var data = result.GetRange(0, Math.Min(result.Count, pagination.Limit)); 
    DatetimeCursor? cursor = null;
    if (hasNext)
    {
      var last = data.Last();
      cursor = hasNext ? new DatetimeCursor((DateTime)indexedField.Compile().Invoke(last), last.Id) : null;
    }
    return new PaginatedResponse<TData,DatetimeCursor>(pagination.Limit, cursor, hasNext, data.ToImmutableList());

  }
}