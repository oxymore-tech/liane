using System;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Auth;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Trip.Geolocation;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class TripTrackerTest : BaseIntegrationTest
{
  private async Task<(Api.Trip.Trip trip, ImmutableList<UserPing> pings)> PrepareTestData(Ref<User> driver, Ref<User> passenger)
  {
    currentContext.SetCurrentUser(driver);
    var departureTime = DateTime.Parse("2023-08-08T16:12:53.061Z");
    var trip = await tripService.Create(new TripRequest(
      null,
      null!,
      departureTime,
      null,
      3,
      LabeledPositions.Tournefeuille, LabeledPositions.PointisInard
    ));
    trip = await tripService.AddMember(trip, new TripMember(passenger, LabeledPositions.Tournefeuille, LabeledPositions.AireDesPyrénées));
    var geojsonPings = JsonSerializer.Deserialize<FeatureCollection>(AssertExtensions.ReadTestResource("Geolocation/test-tournefeuille-pointis-inard.json"))!;
    var pings = geojsonPings.Features.Select(f =>
      {
        var point = (f.Geometry as Point)!;
        var time = f.Properties["timestamp"].ToString()!;
        var user = f.Properties["user"].ToString()!;
        var mappedUser = user == "6410edc1e02078e7108a5897" ? driver : passenger;
        return new UserPing(mappedUser, DateTime.Parse(time), new LatLng(point.Coordinates.Latitude, point.Coordinates.Longitude));
      })
      .OrderBy(p => p.At)
      .ToImmutableList();
    return (trip, pings);
  }

  [Test]
  public async Task ShouldFinishTrip()
  {
    var finished = false;
    var driver = Fakers.FakeDbUsers[0].MapToUser();
    var passenger = Fakers.FakeDbUsers[1].MapToUser();
    var (liane, pings) = await PrepareTestData(driver, passenger);
    var tracker = await lianeTrackerService.Start(liane, () => { finished = true; });

    foreach (var p in pings)
    {
      if (finished)
      {
        break;
      }

      try
      {
        await lianeTrackerService.PushPing(liane, p);
      }
      catch (ResourceNotFoundException e)
      {
        if (e.Message != "Arrived")
        {
          Assert.Fail("Unexpected exception: " + e.Message);
        }
      }
    }

    var lastLocation = tracker.GetCurrentMemberLocation(driver);
    var driverHasFinished = tracker.MemberHasArrived(driver);
    var passengerHasFinished = tracker.MemberHasArrived(passenger);
    Assert.AreEqual(liane.WayPoints.Last().RallyingPoint.Id, lastLocation!.NextPoint.Id);

    Assert.True(finished);
    Assert.True(driverHasFinished);
    Assert.True(passengerHasFinished);
  }

  [Test]
  public async Task MemberShouldNotFinishTrip()
  {
    var driver = Fakers.FakeDbUsers[0].MapToUser();
    var passenger = Fakers.FakeDbUsers[1].MapToUser();
    var (liane, pings) = await PrepareTestData(driver, passenger);
    var tracker = await lianeTrackerService.Start(liane);

    foreach (var p in pings.Take(pings.Count / 2))
    {
      await lianeTrackerService.PushPing(liane, p);
    }

    var lastLocation = tracker.GetCurrentMemberLocation(driver);
    var driverHasFinished = tracker.MemberHasArrived(driver);
    var passengerHasFinished = tracker.MemberHasArrived(passenger);
    Assert.AreEqual(LabeledPositions.AireDesPyrénées.Id, lastLocation!.NextPoint.Id);
    Assert.False(driverHasFinished);
    Assert.False(passengerHasFinished);

    foreach (var p in pings.Skip(pings.Count / 2))
    {
      await lianeTrackerService.PushPing(liane, p);
      if (p.Coordinate!.Value.Distance(Positions.PointisInard) < 4000) break;
    }

    lastLocation = tracker.GetCurrentMemberLocation(driver);
    driverHasFinished = tracker.MemberHasArrived(driver);
    passengerHasFinished = tracker.MemberHasArrived(passenger);
    Assert.AreEqual(LabeledPositions.PointisInard.Id, lastLocation!.NextPoint.Id);
    Assert.False(driverHasFinished);
    Assert.True(passengerHasFinished);

    // Check that a ping far away from the initial track does not finish the trip
    var southWest = new LatLng(Positions.PointisInard.Lat - 0.08, Positions.PointisInard.Lng + 0.3);
    await lianeTrackerService.PushPing(liane, new UserPing(driver, pings.Last().At, southWest));

    lastLocation = tracker.GetCurrentMemberLocation(driver);
    driverHasFinished = tracker.MemberHasArrived(driver);

    Assert.AreEqual(LabeledPositions.PointisInard.Id, lastLocation!.NextPoint.Id);
    Assert.False(driverHasFinished);
  }

  [Test]
  public async Task ShouldNotFinishTrip()
  {
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-1.json");

    var trackingInfo = tracker.GetTrackingInfo();
    Assert.AreEqual("mairie:31427", trackingInfo.Car!.NextPoint.Id);

    var trip = await tripService.Get(trackingInfo.Liane);
    Assert.AreEqual(trip.State, TripStatus.Started);
  }

  [Test]
  public async Task ShouldTrackNextWayPointWithPassengers()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende.json", "2023-12-05T07:42:00Z");

    // check that next point is Quezac (the car is going towards Quezac)
    var actual = tracker.GetTrackingInfo();
    Assert.AreEqual("Quezac_Parking", actual.Car?.NextPoint.Id);
  }

  [Test]
  public async Task ShouldTrackFirstWayPointWithPassengers()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende.json", "2023-12-05T07:38:00Z");

    // check that next point is Quezac (the car is going towards Quezac)
    var actual = tracker.GetTrackingInfo();
    Assert.AreEqual("Quezac_Parking", actual.Car?.NextPoint.Id);
    Assert.Less(Math.Abs(actual.Car!.Delay - 562000), 10000); // Check difference with expected value is less than 10 seconds
    Assert.AreEqual(DateTime.Parse("2023-12-05T07:37:34.113Z").ToUniversalTime(), actual.Car.At);
  }

  [Test]
  public async Task ShouldTrackDestinationWayPoint()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende.json", "2023-12-05T07:44:00Z");

    var actual = tracker.GetTrackingInfo();

    // check that next point is Mende 
    Assert.AreEqual("Mende", actual.Car?.NextPoint.Id);
    Assert.Less(Math.Abs(actual.Car!.Delay - 1430000), 10000); // Check difference with expected value is less than 10 seconds
  }

  [Test]
  public async Task ShouldNotHavePassengersInCarWhenNoPassengersPing()
  {
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-2.json", "2023-11-16T07:46:00Z");

    var actual = tracker.GetTrackingInfo();
    // Check who's in the car
    CollectionAssert.AreEquivalent(ImmutableList.Create(tracker.Trip.Driver.User.Id), actual.Car!.Members.Select(m => m.Id));
  }

  [Test]
  public async Task ShouldNotHavePassengersInCarBeforePickup()
  {
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-2.json", "2023-11-16T07:54:00Z");

    var actual = tracker.GetTrackingInfo();
    // Check who's in the car
    CollectionAssert.AreEquivalent(ImmutableList.Create(tracker.Trip.Driver.User.Id), actual.Car!.Members.Select(m => m.Id));
    // Check we do have location for the other member
    Assert.AreEqual(1, actual.OtherMembers.Count);
    Assert.AreNotEqual(tracker.Trip.Driver.User.Id, actual.OtherMembers.Keys.First());
  }

  [Test]
  public async Task ShouldHavePassengersInCar()
  {
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-2.json", "2023-11-16T08:02:00Z");

    var actual = tracker.GetTrackingInfo();
    // Check who's in the car
    CollectionAssert.AreEquivalent(tracker.Trip.Members.Select(m => m.User.Id), actual.Car!.Members.Select(m => m.Id));
    // Check car's current location
    var expectedLocation = tracker.GetCurrentMemberLocation(
      tracker.Trip.Members.First(m => m.User != tracker.Trip.Driver.User
      ).User)?.Location;
    Assert.Less(1, actual.Car.Position.Distance(expectedLocation!.Value));
  }

  private async Task<(TripTracker, ImmutableList<UserPing>, ImmutableDictionary<Ref<User>, Ref<User>>)> SetupTracker(string file)
  {
    var bson = BsonDocument.Parse(AssertExtensions.ReadTestResource(file));
    var lianeDb = BsonSerializer.Deserialize<LianeDb>(bson);
    var userMapping = lianeDb.Members.Select((m, i) => (m, i)).ToImmutableDictionary(m => (Ref<User>)m.m.User.Id, m => (Ref<User>)Fakers.FakeDbUsers[m.i].Id);
    lianeDb = lianeDb with
    {
      State = TripStatus.Started,
      Driver = lianeDb.Driver with { User = userMapping[lianeDb.Driver.User] },
      Members = lianeDb.Members.Select(m => m with { User = userMapping[m.User] }).ToImmutableList(),
      Pings = lianeDb.Pings.Select(p => p with { User = userMapping[p.User] }).ToImmutableList()
    };
    await mongo.GetCollection<LianeDb>().InsertOneAsync(lianeDb);
    var trip = await tripService.Get(lianeDb.Id);
    var tracker = await lianeTrackerService.Start(trip);
    var pings = lianeDb.Pings
      .OrderBy(p => p.At)
      .ToImmutableList();

    return (tracker, pings, userMapping.ToImmutableDictionary(e => e.Value, e => e.Key));
  }

  private async Task<(TripTracker, ImmutableDictionary<Ref<User>, Ref<User>>)> SetupTrackerAt(string file, string? at = null)
  {
    var (tracker, pings, userMapping) = await SetupTracker(file);
    // Send first few pings outside of planned route
    var sublist = (at is null ? pings : pings.TakeWhile(p => p.At.ToUniversalTime() < DateTime.Parse(at).ToUniversalTime())).ToList();

    foreach (var p in sublist)
    {
      try
      {
        await lianeTrackerService.PushPing(tracker.Trip.Id, p);
      }
      catch (ResourceNotFoundException)
      {
      }
    }

    return (tracker, userMapping);
  }


  [Test]
  public async Task ShouldNotHaveMembersInCar()
  {
    // Init data with json pings Ispagnac (driver) -> Quezac  (passenger) -> Mende, with pings received only by passenger
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-3.json", "2023-12-14T08:05:00Z");

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
    var (tracker, _) = await SetupTrackerAt("Geolocation/liane-pings-case-Ispagnac-Mende-3.json", "2023-12-14T08:30:00Z");

    // check that next point is Quezac (the car is going towards Quezac)
    var actual = tracker.GetTrackingInfo();
    Assert.IsNotNull(actual.Car);
  }

  [Test]
  public async Task Trip_16_12_2023()
  {
    var (tracker, userMapping) = await SetupTrackerAt("Geolocation/16_12_2023-pings.json", "2023-12-16T12:22:00+1");

    // Départ : Choizal : 44.4595512, 3.452795

    // driver nadege : 6578c34d5030769a55e888d7
    // augustin : 63f73936d3436d499d1075f6
    // brutus : 654e2de81435035edcef9b7f

    // car : 44.485822, 3.45858 -> 287 seconds

    // Attention : ce test case provient de données réelles, mais les pings de brutus ne sont pas consistants ce qui cause des erreurs d'interprétations:
    // IOS (brutus) envoie plusieurs fois la coordonnées du début pendant tout le trajet (entrelacées avec les bonnes coordonnées) à cause d'un bug dans la fonction reping (ios.ts)

    var actual = tracker.GetTrackingInfo();

    var unmappedActual = actual with
    {
      Car = actual.Car is null ? null : actual.Car with { Members = actual.Car.Members.Select(m => userMapping[m]).ToImmutableHashSet() },
      OtherMembers = actual.OtherMembers.ToImmutableDictionary(m => userMapping[m.Key].Id, m => m.Value with { Member = userMapping[m.Value.Member] })
    };
    AssertJson.AreEqual("Geolocation/16_12_2023-expected-12_22.json", unmappedActual);
  }

  [Test]
  public async Task Trip_qui_se_trouve_deja_a_destination()
  {
    var (tracker, _) = await SetupTrackerAt("Geolocation/Trip_qui_se_trouve_deja_a_destination.json");

    // Départ : Roques
    // Arrivée : LivingObjects

    // driver thibauls : 6617e60b606952ceee7ee2aa
    // augustin : ba3

    // thibault se trouve déjà à destination
    //await lianeTrackerService.PushPing("6617e60b606952ceee7ee2aa", new UserPing("65f2cbd9e94a0516ac1e6dac", DateTime.Parse("2024-04-11T13:03:00+1"), new LatLng(3.4845875, 44.3378072)));

    var actual = tracker.GetTrackingInfo();

    Assert.AreEqual("custom:001", actual.Car?.NextPoint.Id);

    var trip = await tripService.Get(actual.Liane);
    Assert.AreEqual(TripStatus.Archived, trip.State);
  }


  private IMongoDatabase mongo = null!;
  private ITripService tripService = null!;
  private ILianeTrackerService lianeTrackerService = null!;
  private MockCurrentContext currentContext = null!;

  protected override void Setup(IMongoDatabase db)
  {
    mongo = db;
    tripService = ServiceProvider.GetRequiredService<ITripService>();
    lianeTrackerService = ServiceProvider.GetRequiredService<ILianeTrackerService>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }
}