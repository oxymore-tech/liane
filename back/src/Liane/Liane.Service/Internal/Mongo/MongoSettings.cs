using System;
using System.Collections.Immutable;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo.Serialization;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo;

public sealed record MongoSettings(string Host, string Username, string Password)
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

        var mongo = new MongoClient(new MongoClientSettings
        {
            Server = new MongoServerAddress(Host, 27017),
            Credential = MongoCredential.CreateCredential("admin", Username, Password)
        });

        return mongo.GetDatabase("liane");
    }
};

public static class MongoDatabaseExtensions
{
    public static IMongoCollection<T> GetCollection<T>(this IMongoDatabase mongoDatabase)
    {
        var collectionName = typeof(T).Name.Replace("Db", "", StringComparison.OrdinalIgnoreCase);
        return mongoDatabase.GetCollection<T>(collectionName.ToSnakeCase());
    }
}