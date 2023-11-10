using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class RallyingPointServiceImplTest : BaseIntegrationTest
{
  private IRallyingPointService testedService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    testedService = ServiceProvider.GetRequiredService<IRallyingPointService>();
  }

  [Test]
  public async Task ShoudList()
  {
    var actual = await testedService.List(new RallyingPointFilter());
    Assert.IsNotEmpty(actual.Data);
  }
  
  [Test]
  public async Task ShouldSnap()
  {
    var actual = await testedService.Snap(new LatLng(44.352838, 3.524227), 10000);
    Assert.AreEqual(LabeledPositions.QuezacParking, actual);
    
    var actual2 = await testedService.SnapViaRoute(new LatLng(44.352838, 3.524227), 10000);
    Assert.AreEqual(LabeledPositions.QuezacParking, actual2);
  }
  
    
}