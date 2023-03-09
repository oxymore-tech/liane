using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Util;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using NUnit.Framework;
using Filter = Liane.Api.Trip.Filter;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeServiceImplTest : BaseIntegrationTest
{
  private LianeServiceImpl testedService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    var routingService = ServiceProvider.GetRequiredService<IRoutingService>();
    var rallyingPointService = ServiceProvider.GetRequiredService<IRallyingPointService>();
    testedService = new LianeServiceImpl(db, routingService, Moq.Mock.Of<ICurrentContext>(), rallyingPointService, Moq.Mock.Of<IChatService>());
  }

  [Test]
  public async Task ShouldDisplayLiane()
  {
    var userA = Fakers.FakeDbUsers[0].Id;

    var now = DateTime.UtcNow;

    var liane1Id = ObjectId.Parse("6408a644437b60cfd3b15874").ToString();
    await InsertLiane(liane1Id, now, userA, LabeledPositions.Cocures, LabeledPositions.Mende);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    // Check we get all points in the requested area
    CollectionAssert.AreEquivalent(ImmutableList.Create(
        LabeledPositions.Cocures.Id,
        LabeledPositions.LeCrouzet.Id,
        LabeledPositions.LesBondonsParking.Id,
        LabeledPositions.Rampon.Id
      ),
      actual.Points.Select(p => p.RallyingPoint.Id));
    var pointDisplay = actual.Points.Find(p => p.RallyingPoint.Id == LabeledPositions.Cocures.Id)!;
    Assert.AreEqual(1, pointDisplay.Lianes.Count);
    Assert.AreEqual(liane1Id, pointDisplay.Lianes[0].Id);

    AssertJson.AreEqual("Segment.cocures-mende.json", actual.Segments);
  }

  [Test]
  public async Task ShouldDisplay2Lianes()
  {
    var userA = Fakers.FakeDbUsers[0].Id;

    var now = DateTime.UtcNow;
    var liane1Id = ObjectId.Parse("6408a644437b60cfd3b15874").ToString();
    await InsertLiane(liane1Id, now, userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    var liane2Id = ObjectId.Parse("6408a644437b60cfd3b15875").ToString();
    await InsertLiane(liane2Id, now, userA, LabeledPositions.Cocures, LabeledPositions.Florac);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    // Check we get all points in the requested area
    CollectionAssert.AreEquivalent(ImmutableList.Create(
        LabeledPositions.Cocures.Id,
        LabeledPositions.LeCrouzet.Id,
        LabeledPositions.LesBondonsParking.Id,
        LabeledPositions.Rampon.Id
      ),
      actual.Points.Select(p => p.RallyingPoint.Id));
    var pointDisplay = actual.Points.Find(p => p.RallyingPoint.Id == LabeledPositions.Cocures.Id)!;
    Assert.AreEqual(2, pointDisplay.Lianes.Count);
    Assert.AreEqual(liane1Id, pointDisplay.Lianes[0].Id);
    Assert.AreEqual(liane2Id, pointDisplay.Lianes[1].Id);

    AssertJson.AreEqual("Segment.cocures-florac-mende.json", actual.Segments);
  }

  [Test]
  public async Task ShouldDisplay3Lianes()
  {
    var userA = Fakers.FakeDbUsers[0].Id;

    var now = DateTime.UtcNow;
    var liane1Id = ObjectId.Parse("6408a644437b60cfd3b15874").ToString();
    await InsertLiane(liane1Id, now, userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    var liane2Id = ObjectId.Parse("6408a644437b60cfd3b15875").ToString();
    await InsertLiane(liane2Id, now, userA, LabeledPositions.Cocures, LabeledPositions.Florac);
    var liane3Id = ObjectId.Parse("6408a644437b60cfd3b15876").ToString();
    await InsertLiane(liane3Id, now, userA, LabeledPositions.LeCrouzet, LabeledPositions.LesBondonsParking);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    // Check we get all points in the requested area
    CollectionAssert.AreEquivalent(ImmutableList.Create(
        LabeledPositions.Cocures.Id,
        LabeledPositions.LeCrouzet.Id,
        LabeledPositions.LesBondonsParking.Id,
        LabeledPositions.Rampon.Id
      ),
      actual.Points.Select(p => p.RallyingPoint.Id));
    var pointDisplay = actual.Points.Find(p => p.RallyingPoint.Id == LabeledPositions.Cocures.Id)!;
    Assert.AreEqual(2, pointDisplay.Lianes.Count);
    Assert.AreEqual(liane1Id, pointDisplay.Lianes[0].Id);
    Assert.AreEqual(liane2Id, pointDisplay.Lianes[1].Id);

    AssertJson.AreEqual("Segment.cocures-florac-mende-lecrouzet-bondons.json", actual.Segments);
  }

  [Test]
  public async Task ShouldDisplay3LianesWithIntersection()
  {
    var userA = Fakers.FakeDbUsers[0].Id;

    var now = DateTime.UtcNow;
    var liane1Id = ObjectId.Parse("6408a644437b60cfd3b15874").ToString();
    await InsertLiane(liane1Id, now, userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    var liane2Id = ObjectId.Parse("6408a644437b60cfd3b15875").ToString();
    await InsertLiane(liane2Id, now, userA, LabeledPositions.Cocures, LabeledPositions.Florac);
    var liane3Id = ObjectId.Parse("6408a644437b60cfd3b15876").ToString();
    await InsertLiane(liane3Id, now, userA, LabeledPositions.LeCrouzet, LabeledPositions.Rampon);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    // Check we get all points in the requested area
    CollectionAssert.AreEquivalent(ImmutableList.Create(
        LabeledPositions.Cocures.Id,
        LabeledPositions.LeCrouzet.Id,
        LabeledPositions.LesBondonsParking.Id,
        LabeledPositions.Rampon.Id
      ),
      actual.Points.Select(p => p.RallyingPoint.Id));
    var pointDisplay = actual.Points.Find(p => p.RallyingPoint.Id == LabeledPositions.Cocures.Id)!;
    Assert.AreEqual(2, pointDisplay.Lianes.Count);
    Assert.AreEqual(liane1Id, pointDisplay.Lianes[0].Id);
    Assert.AreEqual(liane2Id, pointDisplay.Lianes[1].Id);

    AssertJson.AreEqual("Segment.cocures-florac-mende-lecrouzet-rampon.json", actual.Segments);
  }

  [Test]
  public async Task ShouldDisplay2CrossingLianes()
  {
    var userA = Fakers.FakeDbUsers[0].Id;

    var now = DateTime.UtcNow;
    var liane1Id = ObjectId.Parse("6408a644437b60cfd3b15874").ToString();
    await InsertLiane(liane1Id, now, userA, LabeledPositions.Mende, LabeledPositions.SaintEtienneDuValdonnezParking);
    var liane2Id = ObjectId.Parse("6408a644437b60cfd3b15875").ToString();
    await InsertLiane(liane2Id, now, userA, LabeledPositions.SaintBauzileEglise, LabeledPositions.LanuejolsParkingEglise);

    var actual = await testedService.Display(new LatLng(44.538856, 3.488159), new LatLng(44.419804, 3.585663));
    Assert.IsNotNull(actual);

    // Check we get all points in the requested area
    CollectionAssert.AreEquivalent(ImmutableList.Create(
        LabeledPositions.Mende.Id,
        LabeledPositions.LanuejolsParkingEglise.Id,
        LabeledPositions.SaintBauzileEglise.Id,
        LabeledPositions.SaintEtienneDuValdonnezParking.Id,
        LabeledPositions.RouffiacBoulangerie.Id
      ),
      actual.Points.Select(p => p.RallyingPoint.Id));
    var mendePointDisplay = actual.Points.Find(p => p.RallyingPoint.Id == LabeledPositions.Mende.Id)!;
    Assert.AreEqual(1, mendePointDisplay.Lianes.Count);
    Assert.AreEqual(liane1Id, mendePointDisplay.Lianes[0].Id);
    
    var lanuejolsPointDisplay = actual.Points.Find(p => p.RallyingPoint.Id == LabeledPositions.LanuejolsParkingEglise.Id)!;
    Assert.AreEqual(1, lanuejolsPointDisplay.Lianes.Count);
    Assert.AreEqual(liane2Id, lanuejolsPointDisplay.Lianes[0].Id);

    AssertJson.AreEqual("Segment.mende-valdonnez-beauzile-lanuejols.json", actual.Segments);
  }

  private async Task InsertLiane(string id, DateTime now, string userA, Ref<RallyingPoint> From, Ref<RallyingPoint> To)
  {
    var departureTime = now.Date.AddDays(1).AddHours(9);

    var lianeMembers = ImmutableList.Create(
      new LianeMember(userA, From, To, false, 3)
    );

    await Db.GetCollection<LianeDb>()
      .InsertOneAsync(new LianeDb(id, userA, now, departureTime, null, lianeMembers, new DriverData(userA)));
  }

  [Test]
  public async Task TestMatchLiane()
  {
    var userA = Fakers.FakeDbUsers[0].Id;
    var tomorrow = DateTime.Now.AddDays(1);
    // Create fake Liane in database
    var baseLianes = new[]
    {
      (LabeledPositions.GorgesDuTarnCausses, LabeledPositions.Mende),
      (LabeledPositions.IspagnacParking, LabeledPositions.Mende),
      (LabeledPositions.LavalDuTarnEglise, LabeledPositions.Mende),
      (LabeledPositions.VillefortParkingGare, LabeledPositions.Mende),
      (LabeledPositions.SaintEnimieParking, LabeledPositions.ChamperbouxEglise),
      (RouteSegment)(LabeledPositions.ChamperbouxEglise, LabeledPositions.SaintEnimieParking),
    };

    var createdLianes = new List<Api.Trip.Liane>();
    for (int i = 0; i < baseLianes.Length; i++)
    {
      var lianeRequest = Fakers.LianeRequestFaker.Generate() with { From = baseLianes[i].From, To = baseLianes[i].To, DepartureTime = tomorrow, AvailableSeats = 2 };
      createdLianes.Add(await testedService.Create(lianeRequest, userA));
    }

    var filter1 = new Filter(
      LabeledPositions.SaintEnimieParking,
      LabeledPositions.ChamperbouxEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure)
    );
    var start = Stopwatch.GetTimestamp();
    // Results
    var results = (await testedService.Match(filter1, new Pagination())).Data;
    var resultsMatchIds = results.Select(r => r.Liane.Id).ToImmutableList();
    TestContext.Out.WriteLine((Stopwatch.GetTimestamp() - start) * 1000 / Stopwatch.Frequency);
    // Check results only contain expected matches
    Assert.AreEqual(3, results.Count);
    // Check exact matches
    var expected = createdLianes[4];
    Assert.Contains(expected.Id, resultsMatchIds);
    Assert.IsInstanceOf<Match.Exact>(results.First(m => m.Liane.Id == expected.Id).Match);

    // Check compatible matches
    expected = createdLianes[0];
    Assert.Contains(expected.Id, resultsMatchIds);
    Assert.IsInstanceOf<Match.Compatible>(results.First(m => m.Liane.Id == expected.Id).Match);
    expected = createdLianes[2];
    Assert.Contains(expected.Id, resultsMatchIds);
    Assert.IsInstanceOf<Match.Compatible>(results.First(m => m.Liane.Id == expected.Id).Match);
  }

  private LianeRequest[] CreateBaseLianeRequests()
  {
    var tomorrow = DateTime.Now.AddDays(1);
    // Create fake Liane in database
    var baseLianes = new[]
    {
      (RouteSegment)(LabeledPositions.GorgesDuTarnCausses, LabeledPositions.Mende),
      (LabeledPositions.Florac, LabeledPositions.Mende),
      (LabeledPositions.LavalDuTarnEglise, LabeledPositions.Mende),
      (LabeledPositions.VillefortParkingGare, LabeledPositions.Mende),
    };
    var requests = new LianeRequest[baseLianes.Length];
    for (int i = 0; i < baseLianes.Length; i++)
    {
      var lianeRequest = Fakers.LianeRequestFaker.Generate() with { From = baseLianes[i].From, To = baseLianes[i].To, DepartureTime = tomorrow, AvailableSeats = 2 };
      requests[i] = lianeRequest;
    }

    return requests;
  }

  [Test]
  public async Task TestFilterLianeOnLocation()
  {
    var userA = Fakers.FakeDbUsers[0].Id;
    // Create fake Liane in database
    var baseLianesRequests = CreateBaseLianeRequests();
    var createdLianes = new List<Api.Trip.Liane>();
    foreach (var t in baseLianesRequests)
    {
      createdLianes.Add(await testedService.Create(t, userA));
    }

    // Test with radius 10km
    var filter1 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.ChamperbouxEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure)
    );
    var radius1 = 10000;
    var resultCursor = await testedService.Filter(filter1, radius1);
    var resultIds1 = resultCursor.ToEnumerable().Select(l => l.Id).ToImmutableList();
    Assert.AreEqual(3, resultIds1.Count);
    Assert.Contains(createdLianes[0].Id, resultIds1);
    Assert.Contains(createdLianes[1].Id, resultIds1);
    Assert.Contains(createdLianes[2].Id, resultIds1);

    // Test with radius 500m
    var filter2 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.BalsiegeParkingEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure)
    );
    var radius2 = 500;
    resultCursor = await testedService.Filter(filter2, radius2);
    var resultIds2 = resultCursor.ToEnumerable().Select(l => l.Id).ToImmutableList();
    Assert.AreEqual(2, resultIds2.Count);
    Assert.Contains(createdLianes[0].Id, resultIds2);
    Assert.Contains(createdLianes[2].Id, resultIds2);


    var filter3 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.BalsiegeParkingEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddDays(2), Direction.Departure)
    );
    resultCursor = await testedService.Filter(filter3, radius2);
    var resultIds3 = resultCursor.ToEnumerable().Select(l => l.Id).ToImmutableList();
    Assert.AreEqual(0, resultIds3.Count);
  }


  [Test]
  public async Task TestFilterLianeOnSeatCount()
  {
    var userA = Fakers.FakeDbUsers[0].Id;
    // Create fake Liane in database
    var baseLianesRequests = CreateBaseLianeRequests();
    var createdLianes = new List<Api.Trip.Liane>();
    for (int i = 0; i < baseLianesRequests.Length; i++)
    {
      createdLianes.Add(await testedService.Create(baseLianesRequests[i] with { AvailableSeats = i + 1 }, userA));
    }


    const int radius = 10000;

    var filter1 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.ChamperbouxEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure)
    );
    var resultCursor = await testedService.Filter(filter1, radius);
    var resultIds1 = resultCursor.ToEnumerable().Select(l => l.Id).ToImmutableList();
    Assert.AreEqual(3, resultIds1.Count);
    Assert.Contains(createdLianes[0].Id, resultIds1);
    Assert.Contains(createdLianes[1].Id, resultIds1);
    Assert.Contains(createdLianes[2].Id, resultIds1);

    var filter2 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.ChamperbouxEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure),
      AvailableSeats: -2
    );
    resultCursor = await testedService.Filter(filter2, radius);
    var resultIds2 = resultCursor.ToEnumerable().Select(l => l.Id).ToImmutableList();
    Assert.AreEqual(2, resultIds2.Count);
    Assert.Contains(createdLianes[1].Id, resultIds1);
    Assert.Contains(createdLianes[2].Id, resultIds1);
  }

  [Test]
  public async Task TestListAccessLevel()
  {
    var userA = Fakers.FakeDbUsers[0].Id;
    var userB = Fakers.FakeDbUsers[1].Id;
    const int lianesACount = 3;
    const int lianesBCount = 1;
    var lianesA = Fakers.LianeRequestFaker.Generate(lianesACount);
    var lianeB = Fakers.LianeRequestFaker.Generate();

    await testedService.Create(lianeB, userB);
    foreach (var l in lianesA)
    {
      await testedService.Create(l, userA);
    }

    var resultsA = await testedService.ListForMemberUser(userA, new Pagination());
    var resultsB = await testedService.ListForMemberUser(userB, new Pagination());
    Assert.AreEqual(lianesACount, resultsA.Data.Count);

    Assert.AreEqual(lianesBCount, resultsB.Data.Count);
  }
}