using System;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.User;
using Liane.Test.Mock;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

public abstract class BaseServiceLayerTest 
{
  private IMongoDatabase db;
  protected readonly ServiceProvider ServiceProvider;

  public BaseServiceLayerTest() 
  {
    // Load db with test settings
    var mongo = new MongoSettings("localhost", "mongoadmin", "secret");
    db = mongo.GetDatabase(MongoDatabaseTestExtensions.DbName);
    // Load services 
    var services = new ServiceCollection();
    var osrmClient = new OsrmClient(new OsrmSettings(new Uri("http://liane.gjini.co:5000")));
    services.AddService(RallyingPointServiceMock.CreateMockRallyingPointService(db));
    services.AddService<IOsrmService>(osrmClient);
    services.AddTransient<IRoutingService, RoutingServiceImpl>();

    ServiceProvider = services.BuildServiceProvider();
  }

  [OneTimeSetUp]
  public void SetupMockData()
  {
    db.Drop();
    // Init services in child class 
    InitService(db);
    // Insert mock users & rallying points
    db.GetCollection<DbUser>().InsertMany(Fakers.FakeDbUsers);
    db.GetCollection<RallyingPoint>().InsertMany(LabeledPositions.RallyingPoints);
  }

  protected abstract void InitService(IMongoDatabase db);

  /// <summary>
  /// Clears given Collection. Should be called in [TearDown]
  /// </summary>
  protected void DropTestedCollection<T>()
  {
    db.DropCollection<T>();
  }

  /// <summary>
  /// Create index in given Collection. Should be called in [SetUp]
  /// </summary>
  protected void IndexCollection<T>(CreateIndexModel<T> indexModel)
  {
    db.GetCollection<T>().Indexes.CreateOne(indexModel);
  }
  
  [OneTimeTearDown]
  public void ClearMockData()
  {
    db.Drop();
  }
}