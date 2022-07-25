using System;
using Liane.Api.Util;
using MongoDB.Driver;

namespace Liane.Service.Internal.Util;

public sealed record MongoSettings(string Host, string Username, string Password)
{
    public IMongoDatabase GetDatabase()
    {
        var mongo = new MongoClient(new MongoClientSettings
        {
            Server = new MongoServerAddress(Host, 27017),
            Credential = MongoCredential.CreateCredential("admin", Username, Password)
        });

        return mongo.GetDatabase(MongoKeys.Database());
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