using Liane.Service.Internal.User;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

public abstract class BaseServiceLayerTest
{
  
  private IMongoDatabase Db;

  [OneTimeSetUp]
  public void SetupMockData()
  {
    // Load db with test settings
    var mongo = new MockMongoSettings("localhost", "mongoadmin", "secret");
    Db = mongo.GetDatabase();
    InitService(Db);
    // Insert mock users 
    var t = Fakers.FakeDbUsers;
    Db.GetCollection<DbUser>().InsertMany(Fakers.FakeDbUsers);
  }

  protected abstract void InitService(IMongoDatabase db);

  /// <summary>
  /// Clears given Collection. Should be called in [TearDown]
  /// </summary>
  protected void DropTestedCollection<T>()
  {
    Db.DropCollection<T>();
  }
  
  [OneTimeTearDown]
  public void ClearMockData()
  {
    Db.Drop();
  }
}