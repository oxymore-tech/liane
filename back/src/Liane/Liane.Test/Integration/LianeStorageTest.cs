using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Postgis;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public class LianeStorageTest: BaseIntegrationTest
{
  private ILianeService lianeService = null!;
  private IPostgisService postgisService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    lianeService = ServiceProvider.GetRequiredService<ILianeService>();
    postgisService = ServiceProvider.GetRequiredService<IPostgisService>();
  }
  
  private async Task<ImmutableList<Api.Trip.Liane>> CreateLianes(string creatorId)
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

    var createdLianes = new List<Api.Trip.Liane>();
    foreach (var t in requests)
    {
      createdLianes.Add(await lianeService.Create(t, creatorId));
    }

    return createdLianes.ToImmutableList();
  }

  [Test]
  public async Task ShouldSyncDatabases()
  {
    var userA = Fakers.FakeDbUsers[0].Id;
    var createdLianes = await CreateLianes(userA);
  
    var searchable = await postgisService.ListSearchableLianes();
    
    Assert.AreEqual(createdLianes.Count, searchable.Count);

    await lianeService.ForceSyncDatabase();

    var updatedSearchable = await postgisService.ListSearchableLianes();
    
    CollectionAssert.AreEquivalent(searchable, updatedSearchable);

  }
}