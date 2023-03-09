using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

public abstract class BaseIntegrationTest
{
  private static readonly HashSet<string> DbNames = new();

  protected IMongoDatabase Db = null!;
  protected ServiceProvider ServiceProvider = null!;

  [OneTimeSetUp]
  public async Task SetupMockData()
  {
    var settings = GetMongoSettings();
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
    var settings = GetMongoSettings();
    Db = MongoFactory.GetDatabase(settings, new TestLogger<IMongoDatabase>(), GetUniqueDbName());

    var services = new ServiceCollection();
    var osrmClient = GetOsrmClient();
    services.AddService(new RallyingPointServiceImpl(Db, new TestLogger<RallyingPointServiceImpl>()));
    services.AddService<IOsrmService>(osrmClient);
    services.AddTransient<IRoutingService, RoutingServiceImpl>();

    ServiceProvider = services.BuildServiceProvider();

    Db.Drop();
    // Init services in child class 
    Setup(Db);
    // Insert mock users & rallying points
    Db.GetCollection<DbUser>().InsertMany(Fakers.FakeDbUsers);
    Db.GetCollection<RallyingPoint>().InsertMany(LabeledPositions.RallyingPoints);
    MongoFactory.InitSchema(Db);
  }

  protected abstract void Setup(IMongoDatabase db);

  /// <summary>
  /// Clears given Collection. Should be called in ClearTestedCollections
  /// </summary>
  protected void DropTestedCollection<T>()
  {
    Db.DropCollection<T>();
  }

  private static MongoSettings GetMongoSettings()
  {
    var mongoHost = Environment.GetEnvironmentVariable("MONGO_HOST") ?? "localhost";
    var settings = new MongoSettings(mongoHost, "mongoadmin", "secret");
    return settings;
  }

  private static OsrmClient GetOsrmClient()
  {
    var osrmUrl = Environment.GetEnvironmentVariable("OSRM_URL") ?? "http://liane.gjini.co:5000";
    var osrmClient = new OsrmClient(new OsrmSettings(new Uri(osrmUrl)));
    return osrmClient;
  }

  private string GetUniqueDbName()
  {
    var baseName = $"liane_test_{GetType().Name.ToTinyName()}_{TestContext.CurrentContext.Test.Name.ToTinyName()}";
    var index = 1;
    while (!DbNames.Add(baseName))
    {
      baseName = $"{baseName}_{index}";
      index++;
    }

    return baseName;
  }
}