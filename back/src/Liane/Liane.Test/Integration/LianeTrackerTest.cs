using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Trip;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;
[TestFixture(Category = "Integration")]
public class LianeTrackerTest: BaseIntegrationTest
{

  private (Api.Trip.Liane liane, FeatureCollection pings) PrepareTestData(Ref<User> userId)
  {
    var departureTime = DateTime.Parse("2023-08-08T16:12:53.061Z");
    var liane =  new Api.Trip.Liane(
      "6410edc1e02078e7108a5895",
      userId,
      DateTime.Today,
      departureTime,
      null,
      new List<WayPoint>
      {
        new(LabeledPositions.Tournefeuille, 0, 0, departureTime),
        new(LabeledPositions.AireDesPyrénées, 45*60, 65000, DateTime.Parse("2023-08-08T16:57:54.000Z")),
        new(LabeledPositions.PointisInard, 19*60, 24000, DateTime.Parse("2023-08-08T17:17:05.000Z"))
      }.ToImmutableList(),
      new List<LianeMember>
      {
        new (userId, LabeledPositions.Tournefeuille, LabeledPositions.PointisInard, 3),
        new ("63f7a5c90f65806b1adb3081", LabeledPositions.Tournefeuille, LabeledPositions.AireDesPyrénées)
      }.ToImmutableList(),
      new Driver(userId),
      LianeState.NotStarted,
      null
    );
    return (liane, JsonSerializer.Deserialize<FeatureCollection>(AssertExtensions.ReadTestResource("Geolocation/test-tournefeuille-pointis-inard.json"))!);
  }

  [Test]
  public async Task ShouldFinishTrip()
  {
    var finished = false;
    var userId = "6410edc1e02078e7108a5897"; // driver
    var passenger = "63f7a5c90f65806b1adb3081";
    var (liane, geojsonPings) = PrepareTestData(userId);
    var tracker = await new LianeTracker.Builder(liane)
      .SetTripArrivedDestinationCallback(() =>
      {
        finished = true;
      })
      .Build(
        ServiceProvider.GetService<IOsrmService>()!, 
        ServiceProvider.GetService<IPostgisService>()!, 
        ServiceProvider.GetService<IMongoDatabase>()!, 
        Moq.Mock.Of<ILogger<LianeTracker>>(), 
        Moq.Mock.Of<ILianeMemberTracker>()
        );
 
    var pings = geojsonPings.Features.Select(f =>
    {
      var point = (f.Geometry as Point)!;
      var time = f.Properties["timestamp"].ToString()!;
      var user = f.Properties["user"].ToString()!;
      return (timestamp: DateTime.Parse(time), coordinate: new LatLng(point.Coordinates.Latitude, point.Coordinates.Longitude), user: user);
    });
    foreach (var p in pings.OrderBy(p => p.timestamp))
    {
      if (finished) break;
      await tracker.Push(new UserPing(p.user, p.timestamp, TimeSpan.Zero, p.coordinate));
    }
   
    var lastLocation = tracker.GetCurrentMemberLocation(userId);
    var driverHasFinished = tracker.MemberHasArrived(userId);
    var passengerHasFinished = tracker.MemberHasArrived(passenger);
    Assert.AreEqual(liane.WayPoints.Last().RallyingPoint.Id, lastLocation!.NextPoint.Id); 
    
    Assert.True(finished);
    Assert.True(driverHasFinished);
    Assert.True(passengerHasFinished);

  }

  [Test]
  public async Task MemberShouldNotFinishTrip()
  {

    var userId = "6410edc1e02078e7108a5897"; //driver
    var passenger = "63f7a5c90f65806b1adb3081";
    var (liane, geojsonPings) = PrepareTestData(userId);
    var tracker = await new LianeTracker.Builder(liane)
    
      .Build(
        ServiceProvider.GetService<IOsrmService>()!, 
        ServiceProvider.GetService<IPostgisService>()!, 
        ServiceProvider.GetService<IMongoDatabase>()!, 
        Moq.Mock.Of<ILogger<LianeTracker>>(), 
        Moq.Mock.Of<ILianeMemberTracker>()
      );
    var pings = geojsonPings.Features.Select(f =>
    {
      var point = (f.Geometry as Point)!;
      var time = f.Properties["timestamp"].ToString()!;
      var u = f.Properties["user"].ToString()!;
      return (timestamp: DateTime.Parse(time), coordinate: new LatLng(point.Coordinates.Latitude, point.Coordinates.Longitude), user: u);
    }).OrderBy(p => p.timestamp).ToImmutableList();
    foreach (var p in pings.Take(pings.Count/2))
    {
      await tracker.Push(new UserPing(p.user, p.timestamp, TimeSpan.Zero, p.coordinate));
    }
    var lastLocation = tracker.GetCurrentMemberLocation(userId);
    var driverHasFinished = tracker.MemberHasArrived(userId);
    var passengerHasFinished = tracker.MemberHasArrived(passenger);
    Assert.AreEqual(LabeledPositions.AireDesPyrénées.Id, lastLocation!.NextPoint.Id);
    Assert.False(driverHasFinished);
    Assert.False(passengerHasFinished);
    
    foreach (var p in pings.Skip(pings.Count/2))
    {
      await tracker.Push(new UserPing(p.user, p.timestamp, TimeSpan.Zero, p.coordinate));
      if (p.coordinate.Distance(Positions.PointisInard) < 4000) break;
    }

    lastLocation = tracker.GetCurrentMemberLocation(userId);
    driverHasFinished = tracker.MemberHasArrived(userId);
    passengerHasFinished = tracker.MemberHasArrived(passenger);
    Assert.AreEqual(LabeledPositions.PointisInard.Id, lastLocation!.NextPoint.Id);
    Assert.False(driverHasFinished);
    Assert.True(passengerHasFinished);
   
    // Check that a ping far away from the initial track does not finish the trip
    var southWest = new LatLng(Positions.PointisInard.Lat - 0.08, Positions.PointisInard.Lng + 0.3);
    await tracker.Push(new UserPing(userId, pings.Last().timestamp, TimeSpan.Zero, southWest));
    
    lastLocation = tracker.GetCurrentMemberLocation(userId);
    driverHasFinished = tracker.MemberHasArrived(userId);
    
    Assert.AreEqual(LabeledPositions.PointisInard.Id, lastLocation!.NextPoint.Id);
    Assert.False(driverHasFinished);
  }

  [Test]
  public async Task ShouldNotFinishTrip()
  {
    var finished = false;
    var bson = BsonDocument.Parse(AssertExtensions.ReadTestResource("Geolocation/liane-pings-case-1.json"));
    var lianeDb = BsonSerializer.Deserialize<LianeDb>(bson);
    var userIds = lianeDb.Members.Select((m, i) => (m,i)).ToDictionary(m => m.m.User, m => Fakers.FakeDbUsers[m.i].Id);
    lianeDb = lianeDb with { Members = lianeDb.Members.Select((m, i) => m with { User = userIds[m.User] }).ToImmutableList() };
    await Db.GetCollection<LianeDb>().InsertOneAsync(lianeDb);
    var liane = await lianeService.Get(lianeDb.Id);
    var tracker = await new LianeTracker.Builder(liane)
      .SetTripArrivedDestinationCallback(() =>
      {
        finished = true;
      })
      .Build(
        ServiceProvider.GetService<IOsrmService>()!, 
        ServiceProvider.GetService<IPostgisService>()!, 
        Db,
        Moq.Mock.Of<ILogger<LianeTracker>>(), 
        Moq.Mock.Of<ILianeMemberTracker>()
      );
    var pings = lianeDb.Pings.OrderBy(p => p.At).Select(p => p with{User = userIds[p.User]}).ToImmutableList();
    foreach (var p in pings)
    {
      if (finished) break;
      await tracker.Push(p);
    }
   
    var lastLocation = tracker.GetCurrentMemberLocation(pings.Last().User);
    Assert.AreEqual(liane.WayPoints.Last().RallyingPoint.Id, lastLocation!.NextPoint.Id); 
    
    Assert.False(finished);
  }

  [Test]
  public async Task Should()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende
    var bson = BsonDocument.Parse(AssertExtensions.ReadTestResource("Geolocation/liane-pings-case-Ispagnac-Mende.json"));
    var lianeDb = BsonSerializer.Deserialize<LianeDb>(bson);
    var userIds = lianeDb.Members.Select((m, i) => (m,i)).ToDictionary(m => m.m.User, m => Fakers.FakeDbUsers[m.i].Id);
    lianeDb = lianeDb with { Members = lianeDb.Members.Select((m, i) => m with { User = userIds[m.User] }).ToImmutableList() };
    await Db.GetCollection<LianeDb>().InsertOneAsync(lianeDb);
    var liane = await lianeService.Get(lianeDb.Id);
    var tracker = await new LianeTracker.Builder(liane)
      .Build(
        ServiceProvider.GetService<IOsrmService>()!, 
        ServiceProvider.GetService<IPostgisService>()!, 
        Db,
        Moq.Mock.Of<ILogger<LianeTracker>>(), 
        Moq.Mock.Of<ILianeMemberTracker>()
      );
    var pings = lianeDb.Pings
      .OrderBy(p => p.At)
      .Select(p => p with{User = userIds[p.User]})
      .ToImmutableList();
    
    // Send first few pings outside of planned route
    foreach (var p in pings.TakeWhile(p => p.At < DateTime.Parse("2023-12-05T07:42:00Z")))
    {
      await tracker.Push(p);
    }

    // check that next point is Quezac (the car is going towards Quezac)
    var lastLocation = tracker.GetCurrentMemberLocation(lianeDb.Driver.User);
    Assert.AreEqual(liane.WayPoints.Last().RallyingPoint.Id, lastLocation!.NextPoint.Id); 

  }
  
  private IMongoDatabase Db = null!;
  private ILianeService lianeService = null!;
  protected override void Setup(IMongoDatabase db)
  {
    Db = db;
    lianeService = ServiceProvider.GetRequiredService<ILianeService>();
  }
}