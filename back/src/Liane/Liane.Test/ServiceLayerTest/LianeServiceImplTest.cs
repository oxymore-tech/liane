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
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;
using Filter = Liane.Api.Trip.Filter;

namespace Liane.Test.ServiceLayerTest;

[TestFixture(Category = "Integration")]
public sealed class LianeServiceImplTest : BaseServiceLayerTest
{
  private LianeServiceImpl testedService;

  protected override void InitService(IMongoDatabase db)
  {
    testedService = new LianeServiceImpl(db, ServiceProvider.GetService<IRoutingService>()!, Moq.Mock.Of<ICurrentContext>(), Moq.Mock.Of<IRallyingPointService>(), Moq.Mock.Of<IChatService>());
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
    Assert.IsInstanceOf<ExactMatch>(results.First(m => m.Liane == expected.Id).MatchData);

    // Check compatible matches
    expected = createdLianes[0];
    Assert.Contains(expected.Id, resultsMatchIds);
    Assert.IsInstanceOf<CompatibleMatch>(results.First(m => m.Liane == expected.Id).MatchData);
    expected = createdLianes[2];
    Assert.Contains(expected.Id, resultsMatchIds);
    Assert.IsInstanceOf<CompatibleMatch>(results.First(m => m.Liane == expected.Id).MatchData);
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
      var lianeRequest = Fakers.LianeRequestFaker.Generate() with { From = baseLianes[i].From, To = baseLianes[i].To, DepartureTime = tomorrow, AvailableSeats = 2};
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
      createdLianes.Add(await testedService.Create(baseLianesRequests[i] with {AvailableSeats = i+1} , userA));
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

  protected override void ClearTestedCollections()
  {
    DropTestedCollection<Api.Trip.Liane>();
  }
}