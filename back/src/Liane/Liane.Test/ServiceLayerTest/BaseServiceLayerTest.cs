using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.User;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

public abstract class BaseServiceLayerTest
{
  private IMongoDatabase? db;

  [OneTimeSetUp]
  public void SetupMockData()
  {
    // Load db with test settings
    var mongo = new MongoSettings("localhost", "mongoadmin", "secret");
    db = mongo.GetDatabase(MongoDatabaseTestExtensions.DbName);
    InitService(db);
    // Insert mock users 
    db.GetCollection<DbUser>().InsertMany(Fakers.FakeDbUsers);
  }

  protected abstract void InitService(IMongoDatabase db);

  /// <summary>
  /// Clears given Collection. Should be called in [TearDown]
  /// </summary>
  protected void DropTestedCollection<T>()
  {
    db?.DropCollection<T>();
  }

  [OneTimeTearDown]
  public void ClearMockData()
  {
    db?.Drop();
  }
}