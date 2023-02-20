using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

public class RoutingServiceImplTest : BaseServiceLayerTest
{
  private IRoutingService tested;

  protected override void InitService(IMongoDatabase db)
  {
    tested =  ServiceProvider.GetService<IRoutingService>()!;
  }

  [Test]
  public async Task ReverseTripShouldReturnNull()
  {
    RouteSegment driver = (LabeledPositions.SaintEnimieParking, LabeledPositions.Mende);
    var result = await tested.GetTrip(driver, new []{(RouteSegment)(LabeledPositions.Mende, LabeledPositions.SaintEnimieParking)});
    Assert.Null(result);
    
    var result2 = await tested.GetTrip(driver, new []
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
    
    var result = await tested.GetTrip(driver, segments);
    
    // Assert solution exists
    Assert.NotNull(result);
    // Assert start and end point are ok
    Assert.AreEqual( driver.From.Id, result!.First().RallyingPoint.Id);
    Assert.AreEqual( driver.To.Id, result!.Last().RallyingPoint.Id);
    // Assert each "from" comes before its "to"
    Assert.True(segments.All(s => result!.First(w => w.RallyingPoint.Id == s.From.Id).Order < result!.First(w => w.RallyingPoint.Id == s.To.Id).Order));
    
  }

  
  
}