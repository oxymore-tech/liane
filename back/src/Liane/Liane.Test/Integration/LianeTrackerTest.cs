using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using DeepEqual.Syntax;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Trip.Geolocation;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using MongoDB.Driver.Linq;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public class LianeTrackerTest : BaseIntegrationTest
{
  private (Api.Trip.Liane liane, FeatureCollection pings) PrepareTestData(Ref<User> userId)
  {
    var departureTime = DateTime.Parse("2023-08-08T16:12:53.061Z");
    var liane = new Api.Trip.Liane(
      "6410edc1e02078e7108a5895",
      userId,
      DateTime.Today,
      departureTime,
      null,
      new List<WayPoint>
      {
        new(LabeledPositions.Tournefeuille, 0, 0, departureTime),
        new(LabeledPositions.AireDesPyrénées, 45 * 60, 65000, DateTime.Parse("2023-08-08T16:57:54.000Z")),
        new(LabeledPositions.PointisInard, 19 * 60, 24000, DateTime.Parse("2023-08-08T17:17:05.000Z"))
      }.ToImmutableList(),
      new List<LianeMember>
      {
        new(userId, LabeledPositions.Tournefeuille, LabeledPositions.PointisInard, 3),
        new("63f7a5c90f65806b1adb3081", LabeledPositions.Tournefeuille, LabeledPositions.AireDesPyrénées)
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
    var tracker = await lianeTrackerService.Start(liane, () => { finished = true; });

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
      await lianeTrackerService.PushPing(liane, new UserPing(p.user, p.timestamp, TimeSpan.Zero, p.coordinate));
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
    var tracker = await lianeTrackerService.Start(liane);
    var pings = geojsonPings.Features.Select(f =>
    {
      var point = (f.Geometry as Point)!;
      var time = f.Properties["timestamp"].ToString()!;
      var u = f.Properties["user"].ToString()!;
      return (timestamp: DateTime.Parse(time), coordinate: new LatLng(point.Coordinates.Latitude, point.Coordinates.Longitude), user: u);
    }).OrderBy(p => p.timestamp).ToImmutableList();
    foreach (var p in pings.Take(pings.Count / 2))
    {
      await lianeTrackerService.PushPing(liane, new UserPing(p.user, p.timestamp, TimeSpan.Zero, p.coordinate));
    }

    var lastLocation = tracker.GetCurrentMemberLocation(userId);
    var driverHasFinished = tracker.MemberHasArrived(userId);
    var passengerHasFinished = tracker.MemberHasArrived(passenger);
    Assert.AreEqual(LabeledPositions.AireDesPyrénées.Id, lastLocation!.NextPoint.Id);
    Assert.False(driverHasFinished);
    Assert.False(passengerHasFinished);

    foreach (var p in pings.Skip(pings.Count / 2))
    {
      await lianeTrackerService.PushPing(liane, new UserPing(p.user, p.timestamp, TimeSpan.Zero, p.coordinate));
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
    await lianeTrackerService.PushPing(liane, new UserPing(userId, pings.Last().timestamp, TimeSpan.Zero, southWest));

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
    var userIds = lianeDb.Members.Select((m, i) => (m, i)).ToDictionary(m => m.m.User, m => Fakers.FakeDbUsers[m.i].Id);
    lianeDb = lianeDb with { Members = lianeDb.Members.Select((m, i) => m with { User = userIds[m.User] }).ToImmutableList() };
    await Db.GetCollection<LianeDb>().InsertOneAsync(lianeDb);
    var liane = await lianeService.Get(lianeDb.Id);
    var tracker =  await lianeTrackerService.Start(liane, () => { finished = true; });
    var pings = lianeDb.Pings.OrderBy(p => p.At).Select(p => p with { User = userIds[p.User] }).ToImmutableList();
    foreach (var p in pings)
    {
      if (finished) break;
      await lianeTrackerService.PushPing(liane, p);
    }

    var lastLocation = tracker.GetCurrentMemberLocation(pings.Last().User);
    Assert.AreEqual(liane.WayPoints.Last().RallyingPoint.Id, lastLocation!.NextPoint.Id);

    Assert.False(finished);
  }

  [Test]
  public async Task ShouldTrackNextWayPointWithPassengers()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende
    var tracker = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende.json", "2023-12-05T07:42:00Z");

    // check that next point is Quezac (the car is going towards Quezac)
    var actual = tracker.GetTrackingInfo();
    Assert.AreEqual("Quezac_Parking", actual.Car.NextPoint.Id);
  }
  
  [Test]
  public async Task ShouldTrackFirstWayPointWithPassengers()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende
    var tracker = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende.json", "2023-12-05T07:38:00Z");

    // check that next point is Quezac (the car is going towards Quezac)
    var actual = tracker.GetTrackingInfo();
    Assert.AreEqual("Quezac_Parking", actual.Car.NextPoint.Id);
    Assert.Less(Math.Abs(actual.Car.Delay - 562), 10); // Check difference with expected value is less than 10 seconds
    Assert.AreEqual(DateTime.Parse("2023-12-05T07:37:34.113Z").ToUniversalTime(), actual.Car.At);
  }

  [Test]
  public async Task ShouldTrackDestinationWayPoint()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende
    var tracker = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende.json", "2023-12-05T07:44:00Z");

    var actual = tracker.GetTrackingInfo();
    
    // check that next point is Mende 
    Assert.AreEqual("Mende", actual.Car.NextPoint.Id);
    Assert.Less(Math.Abs(actual.Car.Delay - 1450), 10); // Check difference with expected value is less than 10 seconds
  }
  
  [Test]
  public async Task ShouldNotHavePassengersInCarWhenNoPassengersPing()
  {
    var tracker = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-2.json", "2023-11-16T07:46:00Z");

    var actual = tracker.GetTrackingInfo();
    // Check who's in the car
    CollectionAssert.AreEquivalent(ImmutableList.Create(tracker.Liane.Driver.User.Id), actual.Car.Members.Select(m => m.Id));
    
  }
  [Test]
  public async Task ShouldNotHavePassengersInCarBeforePickup()
  {
    var tracker = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-2.json", "2023-11-16T07:54:00Z");

    var actual = tracker.GetTrackingInfo();
    // Check who's in the car
    CollectionAssert.AreEquivalent(ImmutableList.Create(tracker.Liane.Driver.User.Id), actual.Car.Members.Select(m => m.Id));
    // Check we do have location for the other member
    Assert.AreEqual(1, actual.OtherMembers.Count);
    Assert.AreNotEqual(tracker.Liane.Driver.User.Id, actual.OtherMembers.Keys.First());
  }
  
  [Test]
  public async Task ShouldHavePassengersInCar()
  {
    var tracker = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-2.json", "2023-11-16T08:02:00Z");

    var actual = tracker.GetTrackingInfo();
    // Check who's in the car
    CollectionAssert.AreEquivalent(tracker.Liane.Members.Select(m => m.User.Id), actual.Car.Members.Select(m => m.Id));
    // Check car's current location
    var expectedLocation = tracker.GetCurrentMemberLocation(
      tracker.Liane.Members.First(m => m.User != tracker.Liane.Driver.User
      ).User)?.Location;
    Assert.Less(1, actual.Car.Position.Distance(expectedLocation!.Value));
  }

  private async Task<(LianeTracker, ImmutableList<UserPing>)> SetupTracker(string file)
  {
    var bson = BsonDocument.Parse(AssertExtensions.ReadTestResource(file));
    var lianeDb = BsonSerializer.Deserialize<LianeDb>(bson);
    var userIds = lianeDb.Members.Select((m, i) => (m, i)).ToDictionary(m => m.m.User, m => Fakers.FakeDbUsers[m.i].Id);
    lianeDb = lianeDb with
    {
      Driver = lianeDb.Driver with { User = userIds[lianeDb.Driver.User] },
      Members = lianeDb.Members.Select((m, i) => m with { User = userIds[m.User] }).ToImmutableList()
    };
    await Db.GetCollection<LianeDb>().InsertOneAsync(lianeDb);
    var liane = await lianeService.Get(lianeDb.Id);
    var tracker = await lianeTrackerService.Start(liane);
    var pings = lianeDb.Pings
      .OrderBy(p => p.At)
      .Select(p => p with { User = userIds[p.User] })
      .ToImmutableList();

    return (tracker, pings);
  }

  private async Task<LianeTracker> SetupTrackerAt(string file, string? at = null)
  {
    var (tracker, pings) = await SetupTracker(file);
    // Send first few pings outside of planned route
    var sublist = (at is null ? pings : pings.TakeWhile(p => p.At.ToUniversalTime() < DateTime.Parse(at).ToUniversalTime())).ToList();
    
    foreach (var p in sublist)
    {
      await lianeTrackerService.PushPing(tracker.Liane, p);
    }

    return tracker;
  }
  
    
  [Test]
  public async Task ShouldNotHaveMembersInCar()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende, with pings received only by passenger
    var tracker = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-3.json", "2023-12-14T08:05:00Z");

    // check that next point is Quezac (the car is going towards Quezac)
    var actual = tracker.GetTrackingInfo();
    Assert.IsNull(actual.Car);
    Assert.AreEqual(1, actual.OtherMembers.Count);
    Assert.AreEqual("Quezac_Parking", actual.OtherMembers.First().Value.NextPoint.Id);
  }
  
  [Test]
  public async Task ShouldHavePickedUpPassenger()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende, with pings received only by passenger
    var tracker = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-3.json", "2023-12-14T08:30:00Z");

    // check that next point is Quezac (the car is going towards Quezac)
    var actual = tracker.GetTrackingInfo();
    Assert.IsNotNull(actual.Car);
  }

  private IMongoDatabase Db = null!;
  private ILianeService lianeService = null!;
  private ILianeTrackerService lianeTrackerService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    Db = db;
    lianeService = ServiceProvider.GetRequiredService<ILianeService>();
    lianeTrackerService = ServiceProvider.GetRequiredService<ILianeTrackerService>();
  }
}