using System;
using Liane.Api.Util;
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
            BsonClassMap.RegisterClassMap<TimeOnly>(cm =>
            {
                cm.AutoMap();
                cm.MapCreator(p => new TimeOnly(p.Hour, p.Minute));
            });
            BsonSerializer.RegisterSerializer(new DateOnlyBsonSerializer());
            BsonSerializer.RegisterSerializer(new TimeOnlyBsonSerializer());
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