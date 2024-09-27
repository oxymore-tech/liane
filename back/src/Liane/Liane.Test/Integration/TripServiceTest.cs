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
public sealed class TripServiceImplTest : BaseIntegrationTest
{
  private TripServiceImpl testedService = null!;
  private MockCurrentContext currentContext = null!;
  private IRoutingService routingService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    testedService = ServiceProvider.GetRequiredService<TripServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    routingService = ServiceProvider.GetRequiredService<IRoutingService>();
  }

  protected override void SetupServices(IServiceCollection services)
  {
    services.AddService(Moq.Mock.Of<IHubService>());
    services.AddService<UserServiceImpl>();
    services.AddService<ChatServiceImpl>();
    services.AddService<TripServiceImpl>();
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

    var createdLianes = new List<Api.Trip.Trip>();
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
    var resultsMatchIds = results.Select(r => r.Trip.Id).ToImmutableList();
    TestContext.Out.WriteLine((Stopwatch.GetTimestamp() - start) * 1000 / Stopwatch.Frequency);
    // Check results only contain expected matches
    Assert.AreEqual(3, results.Count);
    // Check exact matches
    var expected = createdLianes[4];
    Assert.Contains(expected.Id, resultsMatchIds);
    Assert.IsInstanceOf<Match.Exact>(results.First(m => m.Trip.Id == expected.Id).Match);

    // Check compatible matches
    expected = createdLianes[0];
    Assert.Contains(expected.Id, resultsMatchIds);
    var compatible = results.First(m => m.Trip.Id == expected.Id).Match;
    Assert.IsInstanceOf<Match.Compatible>(compatible);
    Assert.AreEqual(294, ((Match.Compatible)compatible).Delta.TotalInSeconds);
    Assert.AreEqual("SaintEnimie_Parking", ((Match.Compatible)compatible).Pickup.Id);
    Assert.AreEqual("Cboux_Eglise", ((Match.Compatible)compatible).Deposit.Id);

    expected = createdLianes[2];
    Assert.Contains(expected.Id, resultsMatchIds);
    compatible = results.First(m => m.Trip.Id == expected.Id).Match;
    Assert.IsInstanceOf<Match.Compatible>(compatible);
    Assert.AreEqual(550, ((Match.Compatible)compatible).Delta.TotalInSeconds);
    Assert.AreEqual("SaintEnimie_Parking", ((Match.Compatible)compatible).Pickup.Id);
    Assert.AreEqual("Cboux_Eglise", ((Match.Compatible)compatible).Deposit.Id);
  }

  private async Task<Api.Trip.Trip> InsertLiane(string id, DbUser userA, Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    var departureTime = DateTime.UtcNow.AddHours(9);
    currentContext.SetCurrentUser(userA);
    return await testedService.Create(new TripRequest(id, Guid.Parse("019233a0-5c48-7cfa-b12e-7e7f0eb9c69f"), departureTime, null, 4, from, to, GeolocationLevel.None), userA.Id);
  }

  public static TripRequest[] CreateBaseLianeRequests()
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
    var requests = new TripRequest[baseLianes.Length];
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
    var createdLianes = new List<Api.Trip.Trip>();
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
    ), actual.Data.Select(l => l.Trip.Id));

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
    var createdLianes = new List<Api.Trip.Trip>();
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
    ), actual.Data.Select(l => l.Trip.Id));

    var filter2 = new Filter(
      LabeledPositions.GorgesDuTarnCausses,
      LabeledPositions.ChamperbouxEglise,
      new DepartureOrArrivalTime(DateTime.Now.AddHours(20), Direction.Departure),
      AvailableSeats: -4
    );
    actual = await testedService.Match(filter2, new Pagination());
    CollectionAssert.IsEmpty(actual.Data.Select(l => l.Trip.Id));
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

    await testedService.AddMember(createdLiane, new TripMember(userB, lianeA.From, lianeA.To));

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
    var created = new List<Api.Trip.Trip>();
    for (var i = 0; i < total; i++)
    {
      var lianeA = Fakers.LianeRequestFaker.Generate();
      created.Add(await testedService.Create(lianeA, userA.Id));
    }

    created = created.OrderByDescending(l => l.DepartureTime).ToList();

    var firstPage = await testedService.List(new LianeFilter { ForCurrentUser = true }, new Pagination(Limit: pageSize, SortAsc: false));
    Assert.AreEqual(20, firstPage.TotalCount);
    Assert.AreEqual(pageSize, firstPage.Data.Count);
    Assert.AreEqual(0, created.FindIndex(l => l.Id == firstPage.Data.First().Id));
    Assert.AreEqual(9, created.FindIndex(l => l.Id == firstPage.Data.Last().Id));
    Assert.NotNull(firstPage.Next);
    var cursorId = (firstPage.Next as Cursor.Time)!.Id;
    Assert.AreEqual(10, created.FindIndex(l => l.Id == cursorId));

    var lastPage = await testedService.List(new LianeFilter { ForCurrentUser = true }, new Pagination(Limit: pageSize, Cursor: firstPage.Next, SortAsc: false));
    Assert.AreEqual(pageSize, lastPage.Data.Count);
    Assert.AreEqual(10, created.FindIndex(l => l.Id == lastPage.Data.First().Id));
    Assert.AreEqual(19, created.FindIndex(l => l.Id == lastPage.Data.Last().Id));
    Assert.Null(lastPage.Next);

    Assert.True(firstPage.Data.First().DepartureTime > lastPage.Data.First().DepartureTime);
  }

  [Test]
  public async Task JbShouldMatchAugustinsLiane()
  {
    var augustin = Fakers.FakeDbUsers[0].Id;
    currentContext.SetAllowPastResourceCreation(true);
    var departureTime = DateTime.Parse("2023-08-08T08:08:00Z");
    var liane = await testedService.Create(
      new TripRequest(null, Guid.Parse("019233a0-5c48-7cfa-b12e-7e7f0eb9c69f"), departureTime, null, 3, LabeledPositions.BlajouxParking, LabeledPositions.Mende, GeolocationLevel.None), augustin);
    var actual = await testedService.Match(new Filter(LabeledPositions.Cocures, LabeledPositions.Mende, new DepartureOrArrivalTime(departureTime.AddHours(1), Direction.Arrival)),
      new Pagination());

    // await DebugGeoJson(LabeledPositions.Cocures, LabeledPositions.Mende);

    Assert.AreEqual(1, actual.Data.Count);

    Assert.AreEqual(liane.Id, actual.Data[0].Trip.Id);
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
    var liane = await testedService.Create(
      new TripRequest(null, Guid.Parse("019233a0-5c48-7cfa-b12e-7e7f0eb9c69f"), DateTime.UtcNow.AddHours(24), null, 3, LabeledPositions.PointisInard, LabeledPositions.Tournefeuille,
        GeolocationLevel.None), samuel.Id);

    currentContext.SetCurrentUser(bertrand);
    var actual = await testedService.Match(
      new Filter(LabeledPositions.Alan, LabeledPositions.Tournefeuille, new DepartureOrArrivalTime(DateTime.UtcNow.AddHours(23), Direction.Departure)),
      new Pagination());

    // await DebugGeoJson(LabeledPositions.Cocures, LabeledPositions.Mende);

    Assert.AreEqual(1, actual.Data.Count);

    Assert.AreEqual(liane.Id, actual.Data[0].Trip.Id);
    Assert.IsInstanceOf<Match.Compatible>(actual.Data[0].Match);
    var compatible = (Match.Compatible)actual.Data[0].Match;

    Assert.IsTrue(compatible.Delta.TotalInSeconds < 15 * 60);
    Assert.AreEqual("mairie:31324", compatible.Pickup.Id);
    Assert.AreEqual("mairie:31557", compatible.Deposit.Id);
  }
}