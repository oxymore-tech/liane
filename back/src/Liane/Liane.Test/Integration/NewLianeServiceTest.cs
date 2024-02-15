using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Liane;
using Liane.Service.Internal.User;
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
    var gugu = Fakers.FakeDbUsers[0];
    var jayBee = Fakers.FakeDbUsers[1];
    var mathilde = Fakers.FakeDbUsers[2];
    var siloe = Fakers.FakeDbUsers[3];
    var lianeGugu = await CreateLiane(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende);
    var lianeJayBee = await CreateLiane(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);
    var lianeMathilde = await CreateLiane(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise);
    var lianeSiloe = await CreateLiane(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende);

    await tested.FindMatches();

    currentContext.SetCurrentUser(gugu);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    Assert.AreEqual(lianeGugu.WayPoints.Select(p => (Ref<RallyingPoint>)p.Id), actual[0].WayPoints);
    Assert.AreEqual(lianeGugu.Constraints, actual[0].Constraints);
  }

  private async Task<Service.Internal.Liane.Liane> CreateLiane(DbUser gugu, string name = "Boulot", params Ref<RallyingPoint>[] wayPoints)
  {
    currentContext.SetCurrentUser(gugu);
    var constraints = ImmutableList.Create<CarPoolingConstraint>(new CarPoolingConstraint.NoReturns());
    return await tested.Create(new LianeQuery(name, wayPoints.ToImmutableList(), constraints));
  }
}