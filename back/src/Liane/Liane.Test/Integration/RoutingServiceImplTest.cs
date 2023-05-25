using System;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class RoutingServiceImplTest : BaseIntegrationTest
{
  private IRoutingService tested = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tested = ServiceProvider.GetService<IRoutingService>()!;
  }

  [Test]
  public async Task ReverseTripShouldReturnNull()
  {
    var departureTime = DateTime.Parse("2023-03-02T08:00:00+01:00");

    RouteSegment driver = (LabeledPositions.SaintEnimieParking, LabeledPositions.Mende);
    var result = await tested.GetTrip(departureTime, driver, new[] { (RouteSegment)(LabeledPositions.Mende, LabeledPositions.SaintEnimieParking) });
    Assert.Null(result);

    var result2 = await tested.GetTrip(departureTime, driver, new[]
    {
      (RouteSegment)(LabeledPositions.ChamperbouxEglise, LabeledPositions.SaintEnimieParking),
      (LabeledPositions.Mende, LabeledPositions.ChamperbouxEglise)
    });
    Assert.Null(result2);
  }

  [Test]
  public async Task TestTripComputation()
  {
    RouteSegment driver = (LabeledPositions.IspagnacParking, LabeledPositions.Mende);
    var segments = new[]
    {
      (RouteSegment)(LabeledPositions.SaintEnimieParking, LabeledPositions.Mende),
      (LabeledPositions.ChamperbouxEglise, LabeledPositions.Mende),
      (LabeledPositions.IspagnacParking, LabeledPositions.BlajouxPelardon),
      (LabeledPositions.BlajouxParking, LabeledPositions.Mende),
    };

    var result = await tested.GetTrip(DateTime.Parse("2023-03-02T08:00:00+01:00"), driver, segments);

    // Assert solution exists
    Assert.NotNull(result);
    // Assert start and end point are ok
    Assert.AreEqual(driver.From.Id, result!.First().RallyingPoint.Id);
    Assert.AreEqual(driver.To.Id, result!.Last().RallyingPoint.Id);
    // Assert each "from" comes before its "to"
    Assert.True(segments.All(s => result!.FindIndex(w => w.RallyingPoint.Id == s.From.Id) < result.FindIndex(w => w.RallyingPoint.Id == s.To.Id)));
  }
}