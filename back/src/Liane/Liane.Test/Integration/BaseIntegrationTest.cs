using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Address;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Service.Internal.Address;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Liane.Service.Internal.Util;
using Liane.Test.Mock;
using Liane.Web.Internal.Json;
using Liane.Web.Internal.Startup;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;
using NLog.Config;
using NLog.Layouts;
using NLog.Targets;
using NLog.Targets.Wrappers;
using NLog.Web;
using NUnit.Framework;

namespace Liane.Test.Integration;

[NonParallelizable]
public abstract class BaseIntegrationTest
{
  private static readonly HashSet<string> DbNames = new();

  private IMongoDatabase mongo = null!;
  protected ServiceProvider ServiceProvider = null!;
  protected MockCurrentContext CurrentContext = null!;

  [OneTimeSetUp]
  public async Task SetupMockData()
  {
    var settings = GetMongoSettings();
    var client = MongoFactory.GetMongoClient(settings, Moq.Mock.Of<ILogger<IMongoDatabase>>());

    var databases = (await client.ListDatabaseNamesAsync())
      .ToEnumerable()
      .Where(d => d.StartsWith("liane_test"));
    foreach (var database in databases)
    {
      await client.DropDatabaseAsync(database);
    }
  }

  [SetUp]
  public async Task EnsureSchema()
  {
    var settings = GetMongoSettings();

    var services = new ServiceCollection();
    var osrmClient = GetOsrmClient();
    var nominatimClient = GetNominatimClient();
    services.AddService<RallyingPointServiceImpl>();
    services.AddService<IOsrmService>(osrmClient);
    services.AddService<IAddressService>(nominatimClient);

    var dbName = GetUniqueDbName();
    services.AddSingleton(sp => MongoFactory.CreateForTest(sp, settings, dbName));

    services.AddTransient<IRoutingService, RoutingServiceImpl>();
    services.AddLogging(builder =>
    {
      builder.SetMinimumLevel(LogLevel.Debug);
      Layout devLayout = new SimpleLayout(
        "${longdate} | ${uppercase:${level:padding=5}} | ${threadid:padding=3} | ${logger:padding=40:fixedLength=true:alignmentOnTruncation=right} | ${message} ${exception:format=ToString}");
      var coloredConsoleTarget = new ColoredConsoleTarget { Layout = devLayout };
      var consoleTarget = new AsyncTargetWrapper("console", coloredConsoleTarget);
      var loggingConfiguration = new LoggingConfiguration();
      loggingConfiguration.AddTarget(consoleTarget);
      loggingConfiguration.AddRule(NLog.LogLevel.Debug, NLog.LogLevel.Fatal, consoleTarget);
      builder.AddNLog(loggingConfiguration);
    });

    services.AddService<MockCurrentContext>();
    services.AddService(JsonSerializerSettings.TestJsonOptions());
    services.AddService<NotificationServiceImpl>();
    services.AddService(new FirebaseSettings(null));
    services.AddService<MockPushServiceImpl>();
    services.AddService(Moq.Mock.Of<IHubService>());
    services.AddService(Moq.Mock.Of<ILianeUpdateObserver>());
    services.AddService(Moq.Mock.Of<ILianeMemberTracker>());
    services.AddService<LianeServiceImpl>();
    services.AddService<UserServiceImpl>();
    services.AddService<PushServiceImpl>();
    services.AddService<ChatServiceImpl>();
    services.AddService<LianeStatusUpdate>();
    services.AddService<LianeRecurrenceServiceImpl>();
    services.AddService<MockAutomaticAnswerService>();
    services.AddEventListeners();

    var databaseSettings = GetDatabaseSettings();

    services.AddService<PostgisDatabase>();
    services.AddService(databaseSettings);
    services.AddService<PostgisUpdateService>();
    services.AddService<PostgisServiceImpl>();

    SetupServices(services);

    ServiceProvider = services.BuildServiceProvider();

    // Init mongo
    CurrentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    mongo = ServiceProvider.GetRequiredService<IMongoDatabase>();
    MongoFactory.InitSchema(mongo);
    var postgisDatabase = ServiceProvider.GetRequiredService<PostgisDatabase>();
    await PostgisFactory.UpdateSchema(postgisDatabase, true);

    mongo.Drop();
    // Init services in child class 
    Setup(mongo);
    // Insert mock users & rallying points
    await mongo.GetCollection<DbUser>().InsertManyAsync(Fakers.FakeDbUsers);

    var rallyingPointService = ServiceProvider.GetRequiredService<IRallyingPointService>();
    await rallyingPointService.Insert(LabeledPositions.RallyingPoints);
  }

  protected virtual void SetupServices(IServiceCollection services)
  {
  }

  protected abstract void Setup(IMongoDatabase db);

  protected async Task<GeoJsonFeatureCollection<GeoJson2DGeographicCoordinates>> DebugGeoJson(params RallyingPoint[] testedPoints)
  {
    var geoJson = new List<GeoJsonFeature<GeoJson2DGeographicCoordinates>>();
    //
    // var postgisService = ServiceProvider.GetRequiredService<IPostgisService>();
    // var geometries = await mongo.GetCollection<LianeDb>()
    //   .Find(FilterDefinition<LianeDb>.Empty)
    //   .Project(l => new GeoJsonFeature<GeoJson2DGeographicCoordinates>(l.Geometry))
    //   .ToListAsync();
    //
    // postgisService.

    var points = await mongo.GetCollection<RallyingPoint>()
      .Find(FilterDefinition<RallyingPoint>.Empty)
      .Project(l => new GeoJsonFeature<GeoJson2DGeographicCoordinates>(new GeoJsonPoint<GeoJson2DGeographicCoordinates>(new GeoJson2DGeographicCoordinates(l.Location.Lng, l.Location.Lat))))
      .ToListAsync();

    // geoJson.AddRange(geometries);
    geoJson.AddRange(points);

    if (testedPoints.Length > 0)
    {
      var routingService = ServiceProvider.GetRequiredService<IRoutingService>();
      var simplifiedRoute =
        new GeoJsonFeature<GeoJson2DGeographicCoordinates>((await routingService.GetRoute(testedPoints.Select(p => p.Location).ToImmutableList())).Coordinates.ToLatLng().ToGeoJson());
      geoJson.Add(simplifiedRoute);
    }

    var collection = new GeoJsonFeatureCollection<GeoJson2DGeographicCoordinates>(geoJson);
    Console.WriteLine("GEOJSON : {0}", collection.ToJson());
    return collection;
  }

  private static MongoSettings GetMongoSettings()
  {
    var host = Environment.GetEnvironmentVariable("MONGO_HOST") ?? "localhost";
    var password = Environment.GetEnvironmentVariable("MONGO_PASSWORD") ?? "secret";
    var username = Environment.GetEnvironmentVariable("MONGO_USERNAME") ?? "mongo";
    return new MongoSettings(host, username, password);
  }

  private static DatabaseSettings GetDatabaseSettings()
  {
    var host = Environment.GetEnvironmentVariable("POSTGIS_HOST") ?? "localhost";
    var password = Environment.GetEnvironmentVariable("POSTGIS_PASSWORD") ?? "secret";
    var username = Environment.GetEnvironmentVariable("POSTGIS_USERNAME") ?? "mongo";
    return new DatabaseSettings(host, "liane_test", username, password);
  }

  private static OsrmClient GetOsrmClient()
  {
    var osrmUrl = Environment.GetEnvironmentVariable("OSRM_URL") ?? "http://liane.gjini.co:5000";
    var osrmClient = new OsrmClient(new OsrmSettings(new Uri(osrmUrl)));
    return osrmClient;
  }

  private static AddressServiceNominatimImpl GetNominatimClient()
  {
    var osrmUrl = Environment.GetEnvironmentVariable("NOMINATIM_URL") ?? "http://liane.gjini.co:7070";
    var osrmClient = new AddressServiceNominatimImpl(new NominatimSettings(new Uri(osrmUrl)));
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