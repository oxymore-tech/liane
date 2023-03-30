using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Liane.Service.Internal.Util;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeServiceImplTest : BaseIntegrationTest
{
  private LianeServiceImpl testedService = null!;
  private MockCurrentContext currentContext = null!;

  protected override void Setup(IMongoDatabase db)
  {
    testedService = ServiceProvider.GetRequiredService<LianeServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  protected override void SetupServices(IServiceCollection services)
  {
    services.AddService(Moq.Mock.Of<IHubService>());
    services.AddService<UserServiceImpl>();
    services.AddService<ChatServiceImpl>();
    services.AddService<LianeServiceImpl>();
  }
  
  [Test]
  public async Task ShouldSimplifyLianeGeometry()
  {
    var userA = Fakers.FakeDbUsers[0];

    var now = DateTime.UtcNow;

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", now, userA, LabeledPositions.BassoCambo, LabeledPositions.Alan);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id), actual.Lianes.Select(l => l.Id));

    AssertJson.AreEqual("Segment.cocures-mende.json", actual.Segments);
  }

  
  [Test]
  public async Task ShouldDisplayLiane()
  {
    var userA = Fakers.FakeDbUsers[0];

    var now = DateTime.UtcNow;

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", now, userA, LabeledPositions.Cocures, LabeledPositions.Mende);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id), actual.Lianes.Select(l => l.Id));

    AssertJson.AreEqual("Segment.cocures-mende.json", actual.Segments);
  }

  [Test]
  public async Task ShouldDisplay2Lianes()
  {
    var userA = Fakers.FakeDbUsers[0];

    var now = DateTime.UtcNow;
    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", now, userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    var liane2 = await InsertLiane("6408a644437b60cfd3b15875", now, userA, LabeledPositions.Cocures, LabeledPositions.Florac);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id, liane2.Id), actual.Lianes.Select(l => l.Id));

    AssertJson.AreEqual("Segment.cocures-florac-mende.json", actual.Segments);
  }

  [Test]
  public async Task ShouldDisplay3Lianes()
  {
    var userA = Fakers.FakeDbUsers[0];

    var now = DateTime.UtcNow;
    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", now, userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    var liane2 = await InsertLiane("6408a644437b60cfd3b15875", now, userA, LabeledPositions.Cocures, LabeledPositions.Florac);
    var liane3 = await InsertLiane("6408a644437b60cfd3b15876", now, userA, LabeledPositions.LeCrouzet, LabeledPositions.LesBondonsParking);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id, liane2.Id, liane3.Id), actual.Lianes.Select(l => l.Id));

    AssertJson.AreEqual("Segment.cocures-florac-mende-lecrouzet-bondons.json", actual.Segments);
  }

  [Test]
  public async Task ShouldDisplay3LianesWithIntersection()
  {
    var userA = Fakers.FakeDbUsers[0];

    var now = DateTime.UtcNow;
    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", now, userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    var liane2 = await InsertLiane("6408a644437b60cfd3b15875", now, userA, LabeledPositions.Cocures, LabeledPositions.Florac);
    var liane3 = await InsertLiane("6408a644437b60cfd3b15876", now, userA, LabeledPositions.LeCrouzet, LabeledPositions.Rampon);

    var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679));
    Assert.IsNotNull(actual);

    CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id, liane2.Id, liane3.Id), actual.Lianes.Select(l => l.Id));

    AssertJson.AreEqual("Segment.cocures-florac-mende-lecrouzet-rampon.json", actual.Segments);
  }

  [Test]
  public async Task ShouldDisplay2CrossingLianes()
  {
    var userA = Fakers.FakeDbUsers[0];

    var now = DateTime.UtcNow;
    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", now, userA, LabeledPositions.Mende, LabeledPositions.SaintEtienneDuValdonnezParking);
    var liane2 = await InsertLiane("6408a644437b60cfd3b15875", now, userA, LabeledPositions.SaintBauzileEglise, LabeledPositions.LanuejolsParkingEglise);

    var box = Geometry.GetBoundingBox(new LatLng(44.538856, 3.488159), new LatLng(44.419804, 3.585663));
    Console.WriteLine("BB {0}", box.ToJson());

    var actual = await testedService.Display(new LatLng(44.538856, 3.488159), new LatLng(44.419804, 3.585663));
    Assert.IsNotNull(actual);

    CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id, liane2.Id), actual.Lianes.Select(l => l.Id));

    AssertJson.AreEqual("Segment.mende-valdonnez-beauzile-lanuejols.json", actual.Segments);
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

  private async Task<Api.Trip.Liane> InsertLiane(string id, DateTime now, DbUser userA, Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    var departureTime = now.Date.AddDays(1).AddHours(9);
    currentContext.SetCurrentUser(userA);
    return await testedService.Create(new LianeRequest(id, departureTime, null, 4, from, to), userA.Id);
  }

  private static LianeRequest[] CreateBaseLianeRequests()
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
    for (var i = 0; i < baseLianes.Length; i++)
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
    var resultCursor = await testedService.Filter(filter1);
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
    resultCursor = await testedService.Filter(filter2);
    var resultIds2 = resultCursor.ToEnumerable().Select(l => l.Id).ToImmutableList();
    Assert.AreEqual(3, resultIds2.Count);
    Assert.Contains(createdLianes[0].Id, resultIds2);
    Assert.Contains(createdLianes[1].Id, resultIds2);
    Assert.Contains(createdLianes[2].Id, resultIds2);

    var filter3 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.BalsiegeParkingEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddDays(2), Direction.Departure)
    );
    resultCursor = await testedService.Filter(filter3);
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
    for (var i = 0; i < baseLianesRequests.Length; i++)
    {
      createdLianes.Add(await testedService.Create(baseLianesRequests[i] with { AvailableSeats = i + 1 }, userA));
    }

    var filter1 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.ChamperbouxEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure)
    );
    var resultCursor = await testedService.Filter(filter1);
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
    resultCursor = await testedService.Filter(filter2);
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

  [Test]
  public async Task TestAddLianeMember()
  {
    var userA = Fakers.FakeDbUsers[0].Id;
    var userB = Fakers.FakeDbUsers[1].Id;
    var lianeA = Fakers.LianeRequestFaker.Generate();
    var createdLiane = await testedService.Create(lianeA, userA);

    var resolvedLianeA = await testedService.Get(createdLiane.Id);
    Assert.NotNull(resolvedLianeA);

    await testedService.AddMember(createdLiane, new LianeMember(userB, lianeA.From, lianeA.To));

    resolvedLianeA = await testedService.Get(createdLiane.Id);
    Assert.AreEqual(createdLiane.Members.Count + 1, resolvedLianeA.Members.Count);
  }
  
  [Test]
  public async Task JbShouldMatchAugustinsLiane()
  {
    var augustin = Fakers.FakeDbUsers[0].Id;
    var jb = Fakers.FakeDbUsers[1].Id;

    var liane = await testedService.Create(new LianeRequest(null, DateTime.Parse("2023-03-02T08:00:00+01:00"), null, 3, LabeledPositions.BlajouxParking, LabeledPositions.Mende), augustin);
    var actual = await testedService.Match(new Filter(LabeledPositions.Cocures, LabeledPositions.Mende, new DepartureOrArrivalTime(DateTime.Parse("2023-03-02T09:00:00+01:00"), Direction.Arrival), -1), new Pagination());

    Assert.IsNotNull(actual);
  }
}