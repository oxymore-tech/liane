using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Test.Integration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Routing;

[TestFixture(Category = "Integration")]
public sealed class RoutingServiceTest : BaseIntegrationTest
{
  private IRoutingService tested = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tested = ServiceProvider.GetService<IRoutingService>()!;
  }

  [Test]
  public async Task ShouldGetTripFromIspagnacToRampon()
  {
    var from = LabeledPositions.IspagnacParking;
    var to = LabeledPositions.Rampon;
    var wayPoints = ImmutableHashSet.Create<Ref<RallyingPoint>>(LabeledPositions.Cocures, LabeledPositions.Florac);

    var result = await tested.GetTrip(from, to, wayPoints);
    var sortedList = result.ToImmutableList();

    // Check that the list contains all rallying points in expected order
    Assert.AreEqual(sortedList.Count, 4);
    var sortedRallyingPoints = result.Select(wayPoint => wayPoint.RallyingPoint);
    Assert.True(sortedRallyingPoints.SequenceEqual(new List<RallyingPoint>
    {
      LabeledPositions.IspagnacParking,
      LabeledPositions.Florac,
      LabeledPositions.Cocures,
      LabeledPositions.Rampon
    }));

    // Check that the duration to get to the first wayPoint is set to 0
    Assert.AreEqual(sortedList[0].Duration, 0);
  }
}