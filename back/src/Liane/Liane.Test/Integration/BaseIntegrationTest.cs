using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Address;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Address;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Liane.Service.Internal.Util;
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

public abstract class BaseIntegrationTest
{
  private static readonly HashSet<string> DbNames = new();

  protected IMongoDatabase Db = null!;
  protected ServiceProvider ServiceProvider = null!;

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
  public void EnsureSchema()
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
    SetupServices(services);

    ServiceProvider = services.BuildServiceProvider();

    Db = ServiceProvider.GetRequiredService<IMongoDatabase>();
    Db.Drop();
    // Init services in child class 
    Setup(Db);
    // Insert mock users & rallying points
    Db.GetCollection<DbUser>().InsertMany(Fakers.FakeDbUsers);
    Db.GetCollection<RallyingPoint>().InsertMany(LabeledPositions.RallyingPoints);
    MongoFactory.InitSchema(Db);
  }

  protected virtual void SetupServices(IServiceCollection services)
  {
  }

  protected abstract void Setup(IMongoDatabase db);

  protected async Task<GeoJsonFeatureCollection<GeoJson2DGeographicCoordinates>> DebugGeoJson(params RallyingPoint[] testedPoints)
  {
    var geoJson = new List<GeoJsonFeature<GeoJson2DGeographicCoordinates>>();

    var geometries = await Db.GetCollection<LianeDb>()
      .Find(FilterDefinition<LianeDb>.Empty)
      .Project(l => new GeoJsonFeature<GeoJson2DGeographicCoordinates>(l.Geometry))
      .ToListAsync();

    var points = await Db.GetCollection<RallyingPoint>()
      .Find(FilterDefinition<RallyingPoint>.Empty)
      .Project(l => new GeoJsonFeature<GeoJson2DGeographicCoordinates>(new GeoJsonPoint<GeoJson2DGeographicCoordinates>(new GeoJson2DGeographicCoordinates(l.Location.Lng, l.Location.Lat))))
      .ToListAsync();


    geoJson.AddRange(geometries);
    geoJson.AddRange(points);

    if (testedPoints.Length > 0)
    {
      var routingService = ServiceProvider.GetRequiredService<IRoutingService>();
      var simplifiedRoute = new GeoJsonFeature<GeoJson2DGeographicCoordinates>((await routingService.GetSimplifiedRoute(testedPoints.Select(p => p.Location).ToImmutableList())).ToGeoJson());
      geoJson.Add(simplifiedRoute);
    }

    var collection = new GeoJsonFeatureCollection<GeoJson2DGeographicCoordinates>(geoJson);
    Console.WriteLine("GEOJSON : {0}", collection.ToJson());
    return collection;
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