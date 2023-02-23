using System;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo.Serialization;
using Liane.Service.Internal.Notification;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo;

public sealed record MongoSettings(string Host, string Username, string Password)
{
  private static bool _init;

  public IMongoDatabase GetDatabase(string databaseName = "liane")
  {
    if (!_init)
    {
      var alwaysPack = new ConventionPack
      {
        new EnumRepresentationConvention(BsonType.String),
      };
      var stringIdAsObjectIdPack = new ConventionPack
      {
        new IdSerializationConvention(),
        new RefSerializationConvention(new [] { typeof(RallyingPoint) }.ToImmutableList())
      };

      ConventionRegistry.Register("EnumStringConvention", alwaysPack, _ => true);
      ConventionRegistry.Register("StringIdAsObjectId", stringIdAsObjectIdPack, t =>
      {
        var use =  !t.IsAssignableFrom(typeof(RallyingPoint));
        return use;
      });
      BsonSerializer.RegisterSerializer(new DateOnlyBsonSerializer());
      BsonSerializer.RegisterSerializer(new TimeOnlyBsonSerializer());
      BsonSerializer.RegisterSerializer(new LatLngBsonSerializer());
   //   BsonSerializer.RegisterGenericSerializerDefinition(typeof(Ref<>), typeof(RefToStringBsonSerializer<>));
      BsonSerializer.RegisterGenericSerializerDefinition(typeof(ImmutableList<>), typeof(ImmutableListSerializer<>));
      BsonSerializer.RegisterDiscriminatorConvention(typeof(BaseNotificationDb), new NotificationDiscriminatorConvention());
      BsonSerializer.RegisterDiscriminator(typeof(LianeEvent), "Type");
      _init = true;
    }

    var mongo = new MongoClient(new MongoClientSettings
    {
      Server = new MongoServerAddress(Host, 27017),
      Credential = MongoCredential.CreateCredential("admin", Username, Password)
    });

    return mongo.GetDatabase(databaseName);
  }
};

public class RefSerializationConvention : ConventionBase, IMemberMapConvention
{

  private readonly ImmutableList<Type> excludedTypes;

  public RefSerializationConvention(ImmutableList<Type> excludedTypes)
  {
    this.excludedTypes = excludedTypes;
  }

  public RefSerializationConvention(string name, ImmutableList<Type> excludedTypes) : base(name)
  {
    this.excludedTypes = excludedTypes;
  }

  /// <inheritdoc/>
  public void Apply(BsonMemberMap memberMap)
  {
    
    if (!memberMap.MemberType.IsGenericType || !memberMap.MemberType.GetGenericTypeDefinition().IsAssignableFrom(typeof(Ref<>)) )
    {
      return;
    }
    
    var referencedType = memberMap.MemberType.GetGenericArguments()[0];
    Type serializerType;
    if (excludedTypes.Contains(referencedType))
    {
      serializerType = typeof(RefToStringBsonSerializer<>).MakeGenericType(referencedType);
    }
    else
    {
      serializerType = typeof(RefToObjectIdBsonSerializer<>).MakeGenericType(referencedType);
    }

    memberMap.SetSerializer((IBsonSerializer)Activator.CreateInstance(serializerType)!);
  }
}
public class IdSerializationConvention : ConventionBase, IMemberMapConvention
{
  /// <inheritdoc/>
  public void Apply(BsonMemberMap memberMap)
  {
    if (memberMap != memberMap.ClassMap.IdMemberMap)
    {
      return;
    }

    if (memberMap.MemberType != typeof(string))
    {
      return;
    }

    var defaultStringSerializer = BsonSerializer.LookupSerializer(typeof(string));
    if (memberMap.GetSerializer() != defaultStringSerializer)
    {
      return;
    }

    if (memberMap.IdGenerator != null)
    {
      return;
    }

    memberMap.SetSerializer(new String2ObjectIdBsonSerializer());
  //  memberMap.SetIdGenerator(StringObjectIdGenerator.Instance);
  }
}

public static class MongoDatabaseExtensions
{
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

  public static async Task<ImmutableList<TOut>> SelectAsync<T, TOut>(this IAsyncCursorSource<T> source, Func<T, Task<TOut>> transformer)
  {
    return await (await source.ToListAsync())
      .SelectAsync(transformer);
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