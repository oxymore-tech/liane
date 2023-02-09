using System;
using System.Collections.Immutable;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Mongo.Serialization;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

namespace Liane.Test.ServiceLayerTest;

public sealed record MockMongoSettings(string Host, string Username, string Password)
{
  private static bool _init;

  public IMongoDatabase GetDatabase()
  {
    if (!_init)
    {
      BsonSerializer.RegisterSerializer(new DateOnlyBsonSerializer());
      BsonSerializer.RegisterSerializer(new TimeOnlyBsonSerializer());
      BsonSerializer.RegisterSerializer(new LatLngBsonSerializer());
      BsonSerializer.RegisterGenericSerializerDefinition(typeof(Ref<>), typeof(RefBsonSerializer<>));
      BsonSerializer.RegisterGenericSerializerDefinition(typeof(ImmutableList<>), typeof(ImmutableListSerializer<>));
      _init = true;
    }

    // TODO change if necessary
    var mongo = new MongoClient(new MongoClientSettings
    {
      Server = new MongoServerAddress(Host, 27017),
      Credential = MongoCredential.CreateCredential("admin", Username, Password)
    });

    return mongo.GetDatabase("liane_test");
  }
};

public static class MongoDatabaseExtensions
{
  public static IMongoCollection<T> GetCollection<T>(this IMongoDatabase mongoDatabase)
  {
    var collectionName = typeof(T).Name.Replace("Db", "", StringComparison.OrdinalIgnoreCase);
    return mongoDatabase.GetCollection<T>(collectionName.ToSnakeCase());
  }
  public static void DropCollection<T>(this IMongoDatabase mongoDatabase)
  {
    var collectionName = typeof(T).Name.Replace("Db", "", StringComparison.OrdinalIgnoreCase);
    mongoDatabase.DropCollection(collectionName.ToSnakeCase());
  }
  public static void Drop(this IMongoDatabase mongoDatabase)
  {
    mongoDatabase.Client.DropDatabase("liane_test");
  }
}