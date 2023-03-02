using System;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.User;
using Liane.Test.Mock;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

public abstract class BaseServiceLayerTest
{
  private IMongoDatabase db;
  protected readonly ServiceProvider ServiceProvider;

  protected BaseServiceLayerTest()
  {
    // Load db with test settings
    // var mongoHost = Environment.GetEnvironmentVariable("MONGO_HOST") ?? "localhost";
    // var settings = new MongoSettings(mongoHost, "mongoadmin", "secret");
    // db = MongoFactory.GetDatabase(settings, new TestLogger<IMongoDatabase>(), MongoDatabaseTestExtensions.DbName);
    
    // Load services 
    var services = new ServiceCollection();
    var osrmUrl = Environment.GetEnvironmentVariable("OSRM_URL") ?? "http://liane.gjini.co:5000";
    var osrmClient = new OsrmClient(new OsrmSettings(new Uri(osrmUrl)));
    services.AddService(RallyingPointServiceMock.CreateMockRallyingPointService(db));
    services.AddService<IOsrmService>(osrmClient);
    services.AddTransient<IRoutingService, RoutingServiceImpl>();

    ServiceProvider = services.BuildServiceProvider();
  }

  [OneTimeSetUp]
  public async Task SetupMockData()
  {
    var mongoHost = Environment.GetEnvironmentVariable("MONGO_HOST") ?? "localhost";
    var settings = new MongoSettings(mongoHost, "mongoadmin", "secret");
    var client = MongoFactory.GetMongoClient(settings, new TestLogger<IMongoDatabase>());

    var databases = (await client.ListDatabaseNamesAsync())
      .ToEnumerable()
      .Where(d => d.StartsWith("liane_test"));
    foreach (var database in databases)
    {
      await client.DropDatabaseAsync(database);
    }
  }

  [SetUp]
  public void EnsureSchema()
  {
    var mongoHost = Environment.GetEnvironmentVariable("MONGO_HOST") ?? "localhost";
    var settings = new MongoSettings(mongoHost, "mongoadmin", "secret");
    db = MongoFactory.GetDatabase(settings, new TestLogger<IMongoDatabase>(), $"liane_test_{GetType().Name.ToTinyName()}_{TestContext.CurrentContext.Test.Name.ToTinyName()}");
    db.Drop();
    // Init services in child class 
    InitService(db);
    // Insert mock users & rallying points
    db.GetCollection<DbUser>().InsertMany(Fakers.FakeDbUsers);
    db.GetCollection<RallyingPoint>().InsertMany(LabeledPositions.RallyingPoints);
    //ClearTestedCollections();
    MongoFactory.InitSchema(db);
  }

  protected abstract void InitService(IMongoDatabase db);

  protected virtual void ClearTestedCollections(){}

  /// <summary>
  /// Clears given Collection. Should be called in ClearTestedCollections
  /// </summary>
  protected void DropTestedCollection<T>()
  {
    db.DropCollection<T>();
  }
}