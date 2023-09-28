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
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Liane.Web.Internal.Startup;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeServiceImplTest : BaseIntegrationTest
{
  private LianeServiceImpl testedService = null!;
  private MockCurrentContext currentContext = null!;
  private IRoutingService routingService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    testedService = ServiceProvider.GetRequiredService<LianeServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    routingService = ServiceProvider.GetRequiredService<IRoutingService>();
  }

  protected override void SetupServices(IServiceCollection services)
  {
    services.AddService(Moq.Mock.Of<IHubService>());
    services.AddService<UserServiceImpl>();
    services.AddService<ChatServiceImpl>();
    services.AddService<LianeServiceImpl>();
    services.AddService<FirebaseMessagingImpl>();
  }

  [Test]
  public async Task ShouldSimplifyLianeGeometry()
  {
    var route = await routingService.GetRoute(ImmutableList.Create(Positions.Toulouse, Positions.Alan));
    var actual = Simplifier.Simplify(route);

    Assert.Less(actual.Count, 100);
  }

  [Test]
  [Ignore("TODO")]
  public Task ShouldDisplayLiane()
  {
    return Task.CompletedTask;
    // TODO test with postgis
    // var userA = Fakers.FakeDbUsers[0];
    //
    // var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    //
    // currentContext.SetCurrentUser(userA, true);
    // var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679), DateTime.Now);
    // Assert.IsNotNull(actual);
    //
    // CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id), actual.Lianes.Select(l => l.Id));
    //
    // Assert.AreEqual(1, actual.Segments.Count);
  }

  [Test]
  [Ignore("TODO")]
  public Task ShouldDisplay2Lianes()
  {
    return Task.CompletedTask;
    // var userA = Fakers.FakeDbUsers[0];
    //
    // var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    // var liane2 = await InsertLiane("6408a644437b60cfd3b15875", userA, LabeledPositions.Cocures, LabeledPositions.Florac);
    //
    // currentContext.SetCurrentUser(userA, true);
    // var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679), DateTime.Now);
    // Assert.IsNotNull(actual);
    //
    // CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id, liane2.Id), actual.Lianes.Select(l => l.Id));
    //
    // Assert.AreEqual(3, actual.Segments.Count);
  }

  [Test]
  [Ignore("TODO")]
  public Task ShouldDisplay3Lianes()
  {
    return Task.CompletedTask;
    // var userA = Fakers.FakeDbUsers[0];
    //
    // var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    // var liane2 = await InsertLiane("6408a644437b60cfd3b15875", userA, LabeledPositions.Cocures, LabeledPositions.Florac);
    // var liane3 = await InsertLiane("6408a644437b60cfd3b15876", userA, LabeledPositions.LeCrouzet, LabeledPositions.LesBondonsParking);
    //
    // currentContext.SetCurrentUser(userA, true);
    // var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679), DateTime.Now);
    // Assert.IsNotNull(actual);
    //
    // CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id, liane2.Id, liane3.Id), actual.Lianes.Select(l => l.Id));
    //
    // Assert.AreEqual(4, actual.Segments.Count);
  }

  [Test]
  [Ignore("TODO")]
  public Task ShouldDisplay3LianesWithIntersection()
  {
    return Task.CompletedTask;
    // var userA = Fakers.FakeDbUsers[0];
    //
    // var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende);
    // var liane2 = await InsertLiane("6408a644437b60cfd3b15875", userA, LabeledPositions.Cocures, LabeledPositions.Florac);
    // var liane3 = await InsertLiane("6408a644437b60cfd3b15876", userA, LabeledPositions.LeCrouzet, LabeledPositions.Rampon);
    //
    // currentContext.SetCurrentUser(userA, true);
    // var actual = await testedService.Display(new LatLng(44.395646, 3.578453), new LatLng(44.290312, 3.660679), DateTime.Now);
    // Assert.IsNotNull(actual);
    //
    // CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id, liane2.Id, liane3.Id), actual.Lianes.Select(l => l.Id));
    //
    // Assert.AreEqual(4, actual.Segments.Count);
  }

  [Test]
  [Ignore("TODO")]
  public Task ShouldDisplay2CrossingLianes()
  {
    return Task.CompletedTask;
    // var userA = Fakers.FakeDbUsers[0];
    //
    // var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Mende, LabeledPositions.SaintEtienneDuValdonnezParking);
    // var liane2 = await InsertLiane("6408a644437b60cfd3b15875", userA, LabeledPositions.SaintBauzileEglise, LabeledPositions.LanuejolsParkingEglise);
    //
    // // var box = Geometry.GetBoundingBox(new LatLng(44.538856, 3.488159), new LatLng(44.419804, 3.585663));
    // // Console.WriteLine("BB {0}", box.ToJson());
    // // await DebugGeoJson();
    //
    // currentContext.SetCurrentUser(userA, true);
    // var actual = await testedService.Display(new LatLng(44.538856, 3.488159), new LatLng(44.419804, 3.585663), DateTime.Now);
    // Assert.IsNotNull(actual);
    //
    // CollectionAssert.AreEquivalent(ImmutableList.Create(liane1.Id, liane2.Id), actual.Lianes.Select(l => l.Id));

    // Assert.AreEqual(6, actual.Segments.Count);
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
    for (var i = 0; i < baseLianes.Length; i++)
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
    var compatible = results.First(m => m.Liane.Id == expected.Id).Match;
    Assert.IsInstanceOf<Match.Compatible>(compatible);
    Assert.AreEqual(294, ((Match.Compatible)compatible).Delta.TotalInSeconds);
    Assert.AreEqual("SaintEnimie_Parking", ((Match.Compatible)compatible).Pickup.Id);
    Assert.AreEqual("Cboux_Eglise", ((Match.Compatible)compatible).Deposit.Id);

    expected = createdLianes[2];
    Assert.Contains(expected.Id, resultsMatchIds);
    compatible = results.First(m => m.Liane.Id == expected.Id).Match;
    Assert.IsInstanceOf<Match.Compatible>(compatible);
    Assert.AreEqual(550, ((Match.Compatible)compatible).Delta.TotalInSeconds);
    Assert.AreEqual("SaintEnimie_Parking", ((Match.Compatible)compatible).Pickup.Id);
    Assert.AreEqual("Cboux_Eglise", ((Match.Compatible)compatible).Deposit.Id);
  }

  private async Task<Api.Trip.Liane> InsertLiane(string id, DbUser userA, Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    var departureTime = DateTime.UtcNow.AddHours(9);
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
  public async Task ShouldMatchLianeOnLocation()
  {
    var userA = Fakers.FakeDbUsers[0].Id;
    // Create fake Liane in database
    var baseLianesRequests = CreateBaseLianeRequests();
    var createdLianes = new List<Api.Trip.Liane>();
    foreach (var t in baseLianesRequests)
    {
      createdLianes.Add(await testedService.Create(t, userA));
    }

    var filter1 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.ChamperbouxEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure)
    );
    var actual = await testedService.Match(filter1, new Pagination());
    CollectionAssert.AreEquivalent(ImmutableList.Create(
      createdLianes[0].Id,
      createdLianes[2].Id
    ), actual.Data.Select(l => l.Liane.Id));

    var filter3 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.BalsiegeParkingEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddDays(2), Direction.Departure)
    );
    actual = await testedService.Match(filter3, new Pagination());
    CollectionAssert.IsEmpty(actual.Data);
  }

  [Test]
  public async Task ShouldMatchLianeOnSeatCount()
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
    var actual = await testedService.Match(filter1, new Pagination());
    CollectionAssert.AreEquivalent(ImmutableList.Create(
      createdLianes[0].Id,
      createdLianes[2].Id
    ), actual.Data.Select(l => l.Liane.Id));

    var filter2 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.ChamperbouxEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure),
      AvailableSeats: -4
    );
    actual = await testedService.Match(filter2, new Pagination());
    CollectionAssert.IsEmpty(actual.Data.Select(l => l.Liane.Id));
  }

  [Test]
  public async Task TestListAccessLevel()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    const int lianesACount = 3;
    const int lianesBCount = 1;
    var lianesA = Fakers.LianeRequestFaker.Generate(lianesACount);
    var lianeB = Fakers.LianeRequestFaker.Generate();

    await testedService.Create(lianeB, userB.Id);
    foreach (var l in lianesA)
    {
      await testedService.Create(l, userA.Id);
    }

    currentContext.SetCurrentUser(userA);
    var resultsA = await testedService.List(new LianeFilter { ForCurrentUser = true }, new Pagination());

    currentContext.SetCurrentUser(userB);
    var resultsB = await testedService.List(new LianeFilter { ForCurrentUser = true }, new Pagination());

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
  public async Task TestListAll()
  {
    var userA = Fakers.FakeDbUsers[0];
    currentContext.SetCurrentUser(userA);
    const int total = 20;
    const int pageSize = 10;
    for (var i = 0; i < total; i++)
    {
      var lianeA = Fakers.LianeRequestFaker.Generate();
      await testedService.Create(lianeA, userA.Id);
    }

    var firstPage = await testedService.List(new LianeFilter { ForCurrentUser = true }, new Pagination(Limit: pageSize, SortAsc: false));
    Assert.AreEqual(pageSize, firstPage.Data.Count);
    Assert.NotNull(firstPage.Next);

    var lastPage = await testedService.List(new LianeFilter { ForCurrentUser = true }, new Pagination(Limit: pageSize, Cursor: firstPage.Next, SortAsc: false));
    Assert.AreEqual(pageSize, lastPage.Data.Count);
    Assert.Null(lastPage.Next);

    Assert.True(firstPage.Data.First().DepartureTime > lastPage.Data.First().DepartureTime);
  }

  [Test]
  public async Task JbShouldMatchAugustinsLiane()
  {
    var augustin = Fakers.FakeDbUsers[0].Id;

    var liane = await testedService.Create(new LianeRequest(null, DateTime.UtcNow.AddHours(24), null, 3, LabeledPositions.BlajouxParking, LabeledPositions.Mende), augustin);
    var actual = await testedService.Match(new Filter(LabeledPositions.Cocures, LabeledPositions.Mende, new DepartureOrArrivalTime(DateTime.UtcNow.AddHours(25), Direction.Arrival)),
      new Pagination());

    // await DebugGeoJson(LabeledPositions.Cocures, LabeledPositions.Mende);

    Assert.AreEqual(1, actual.Data.Count);

    Assert.AreEqual(liane.Id, actual.Data[0].Liane.Id);
    Assert.IsInstanceOf<Match.Compatible>(actual.Data[0].Match);
    var compatible = (Match.Compatible)actual.Data[0].Match;

    Assert.IsTrue(compatible.Delta.TotalInSeconds < 15 * 60);
    Assert.AreEqual("Quezac_Parking", compatible.Pickup.Id);
    Assert.AreEqual("Mende", compatible.Deposit.Id);
  }

  [Test]
  public async Task BertrandShouldMatchSamuelsLiane()
  {
    var samuel = Fakers.FakeDbUsers[0];
    var bertrand = Fakers.FakeDbUsers[1];

    currentContext.SetCurrentUser(samuel);
    var liane = await testedService.Create(new LianeRequest(null, DateTime.UtcNow.AddHours(24), null, 3, LabeledPositions.PointisInard, LabeledPositions.Tournefeuille), samuel.Id);

    currentContext.SetCurrentUser(bertrand);
    var actual = await testedService.Match(
      new Filter(LabeledPositions.Alan, LabeledPositions.Tournefeuille, new DepartureOrArrivalTime(DateTime.UtcNow.AddHours(23), Direction.Departure)),
      new Pagination());

    // await DebugGeoJson(LabeledPositions.Cocures, LabeledPositions.Mende);

    Assert.AreEqual(1, actual.Data.Count);

    Assert.AreEqual(liane.Id, actual.Data[0].Liane.Id);
    Assert.IsInstanceOf<Match.Compatible>(actual.Data[0].Match);
    var compatible = (Match.Compatible)actual.Data[0].Match;

    Assert.IsTrue(compatible.Delta.TotalInSeconds < 15 * 60);
    Assert.AreEqual("mairie:31324", compatible.Pickup.Id);
    Assert.AreEqual("mairie:31557", compatible.Deposit.Id);
  }

}