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
public class TripStorageTest: BaseIntegrationTest
{
  private ITripService tripService = null!;
  private IPostgisService postgisService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tripService = ServiceProvider.GetRequiredService<ITripService>();
    postgisService = ServiceProvider.GetRequiredService<IPostgisService>();
  }
  
  private async Task<ImmutableList<Api.Trip.Trip>> CreateTrips(string creatorId)
  {
    var tomorrow = DateTime.Now.AddDays(1);
    // Create fake Trip in database
    var baseTrips = new[]
    {
      (RouteSegment)(LabeledPositions.GorgesDuTarnCausses, LabeledPositions.Mende),
      (LabeledPositions.Florac, LabeledPositions.Mende),
      (LabeledPositions.LavalDuTarnEglise, LabeledPositions.Mende),
      (LabeledPositions.VillefortParkingGare, LabeledPositions.Mende),
    };
    var requests = new TripRequest[baseTrips.Length];
    for (var i = 0; i < baseTrips.Length; i++)
    {
      var lianeRequest = Fakers.TripRequestFaker.Generate() with { From = baseTrips[i].From, To = baseTrips[i].To, DepartureTime = tomorrow, AvailableSeats = 2 };
      requests[i] = lianeRequest;
    }

    var createdTrips = new List<Api.Trip.Trip>();
    foreach (var t in requests)
    {
      createdTrips.Add(await tripService.Create(t, creatorId));
    }

    return createdTrips.ToImmutableList();
  }

  [Test]
  public async Task ShouldSyncDatabases()
  {
    var userA = Fakers.FakeDbUsers[0].Id;
    var createdTrips = await CreateTrips(userA);
  
    var searchable = await postgisService.ListSearchableTrips();
    
    Assert.AreEqual(createdTrips.Count, searchable.Count);

    await tripService.ForceSyncDatabase();

    var updatedSearchable = await postgisService.ListSearchableTrips();
    
    CollectionAssert.AreEquivalent(searchable, updatedSearchable);

  }
}