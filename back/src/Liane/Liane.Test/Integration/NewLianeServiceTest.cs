using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
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

  protected override void Setup(IMongoDatabase db)
  {
    tested = ServiceProvider.GetRequiredService<NewLianeServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  [Test]
  public async Task ShouldMatchLiane()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    currentContext.SetCurrentUser(userA);
    var wayPoints = ImmutableList.Create<Ref<RallyingPoint>>(LabeledPositions.BlajouxParking, LabeledPositions.Mende);
    var constraints = ImmutableList.Create<CarPoolingConstraint>(new CarPoolingConstraint.NoReturns());
    await tested.Create(new LianeQuery("Boulot", wayPoints, constraints));

    await tested.FindMatches();

    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    Assert.AreEqual(wayPoints.Select(p => (Ref<RallyingPoint>)p.Id), actual[0].WayPoints);
    Assert.AreEqual(constraints, actual[0].Constraints);
  }
}