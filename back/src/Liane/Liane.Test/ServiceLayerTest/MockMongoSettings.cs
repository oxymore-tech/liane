using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Test.ServiceLayerTest;

internal static class MongoDatabaseTestExtensions
{
  public const string DbName = "liane_test";

  public static void DropCollection<T>(this IMongoDatabase mongoDatabase)
  {
    mongoDatabase.DropCollection(MongoDatabaseExtensions.GetCollectionName<T>());
  }

  public static void Drop(this IMongoDatabase mongoDatabase)
  {
    mongoDatabase.Client.DropDatabase(DbName);
  }
}