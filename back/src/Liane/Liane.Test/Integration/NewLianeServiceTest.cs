using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Service.Internal.Liane;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class NewLianeServiceImplTest : BaseIntegrationTest
{
  private NewLianeServiceImpl tested = null!;
  private MockCurrentContext currentContext = null!;
  private IRoutingService routingService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tested = ServiceProvider.GetRequiredService<NewLianeServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    routingService = ServiceProvider.GetRequiredService<IRoutingService>();
  }

  [Test]
  public async Task ShouldMatchLiane()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    
    currentContext.SetCurrentUser(userA);
    await tested.Create(new LianeQuery("Boulot", ImmutableList.Create<CarPoolingConstraint>(new CarPoolingConstraint.FromTo(LabeledPositions.BlajouxParking, LabeledPositions.Mende))));

    await tested.FindMatches();
  }
}