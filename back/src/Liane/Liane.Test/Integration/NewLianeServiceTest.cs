using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Community;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;
using LianeRequest = Liane.Api.Community.LianeRequest;

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
  public async Task GuguShouldMatchLianes()
  {
    var gugu = Fakers.FakeDbUsers[0];
    var jayBee = Fakers.FakeDbUsers[1];
    var mathilde = Fakers.FakeDbUsers[2];
    var siloe = Fakers.FakeDbUsers[3];
    var lianeGugu = await CreateLiane(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende);
    var lianeJayBee = await CreateLiane(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);
    var lianeMathilde = await CreateLiane(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise);
    var lianeSiloe = await CreateLiane(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende);

    var gargamel = Fakers.FakeDbUsers[4];
    var lianeGargamel = await CreateLiane(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking);

    var caramelo = Fakers.FakeDbUsers[5];
    var lianeCaramelo = await CreateLiane(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise);

    var bertrand = Fakers.FakeDbUsers[6];
    var lianeBertrand = await CreateLiane(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse);

    var samuel = Fakers.FakeDbUsers[7];
    var lianeSamuel = await CreateLiane(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane);

    currentContext.SetCurrentUser(gugu);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    Assert.AreEqual(lianeGugu.WayPoints.Select(p => (Ref<RallyingPoint>)p.Id), actual[0].LianeRequest.WayPoints);
    Assert.AreEqual(3, actual[0].Matches.Count);

    Assert.AreEqual(lianeJayBee.Id, actual[0].Matches[0].Liane.Id);
    Assert.AreEqual(LabeledPositions.QuezacParking.Id, actual[0].Matches[0].Pickup.Id);
    Assert.AreEqual(LabeledPositions.Mende.Id, actual[0].Matches[0].Deposit.Id);

    Assert.AreEqual(lianeSiloe.Id, actual[0].Matches[1].Liane.Id);
    Assert.AreEqual(LabeledPositions.QuezacParking.Id, actual[0].Matches[1].Pickup.Id);
    Assert.AreEqual(LabeledPositions.Mende.Id, actual[0].Matches[1].Deposit.Id);

    Assert.AreEqual(lianeMathilde.Id, actual[0].Matches[2].Liane.Id);
    Assert.AreEqual(LabeledPositions.QuezacParking.Id, actual[0].Matches[2].Pickup.Id);
    Assert.AreEqual(LabeledPositions.BalsiegeParkingEglise.Id, actual[0].Matches[2].Deposit.Id);
  }

  [Test]
  public async Task MathildeShouldMatchLianes()
  {
    var gugu = Fakers.FakeDbUsers[0];
    var jayBee = Fakers.FakeDbUsers[1];
    var mathilde = Fakers.FakeDbUsers[2];
    var siloe = Fakers.FakeDbUsers[3];
    var lianeGugu = await CreateLiane(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende);
    var lianeJayBee = await CreateLiane(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);
    var lianeMathilde = await CreateLiane(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise);
    var lianeSiloe = await CreateLiane(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende);

    var gargamel = Fakers.FakeDbUsers[4];
    var lianeGargamel = await CreateLiane(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking);

    var caramelo = Fakers.FakeDbUsers[5];
    var lianeCaramelo = await CreateLiane(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise);

    var bertrand = Fakers.FakeDbUsers[6];
    var lianeBertrand = await CreateLiane(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse);

    var samuel = Fakers.FakeDbUsers[7];
    var lianeSamuel = await CreateLiane(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane);

    currentContext.SetCurrentUser(mathilde);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    Assert.AreEqual(lianeMathilde.WayPoints.Select(p => (Ref<RallyingPoint>)p.Id), actual[0].LianeRequest.WayPoints);
    Assert.AreEqual(3, actual[0].Matches.Count);

    Assert.AreEqual(lianeJayBee.Id, actual[0].Matches[0].Liane.Id);
    Assert.AreEqual(LabeledPositions.FloracFormares.Id, actual[0].Matches[0].Pickup.Id);
    Assert.AreEqual(LabeledPositions.BalsiegeParkingEglise.Id, actual[0].Matches[0].Deposit.Id);

    Assert.AreEqual(lianeSiloe.Id, actual[0].Matches[1].Liane.Id);
    Assert.AreEqual(LabeledPositions.IspagnacParking.Id, actual[0].Matches[1].Pickup.Id);
    Assert.AreEqual(LabeledPositions.BalsiegeParkingEglise.Id, actual[0].Matches[1].Deposit.Id);

    Assert.AreEqual(lianeGugu.Id, actual[0].Matches[2].Liane.Id);
    Assert.AreEqual(LabeledPositions.QuezacParking.Id, actual[0].Matches[2].Pickup.Id);
    Assert.AreEqual(LabeledPositions.BalsiegeParkingEglise.Id, actual[0].Matches[2].Deposit.Id);
  }
  
  [Test]
  public void ExactSameLianeRequestShouldMatch()
  {
  }

  private async Task<LianeRequest> CreateLiane(DbUser gugu, string name, params Ref<RallyingPoint>[] wayPoints)
  {
    currentContext.SetCurrentUser(gugu);
    var timeConstraints = ImmutableList.Create(new TimeConstraint(new TimeRange(new TimeOnly(8, 0), null), wayPoints[0], DayOfWeekFlag.All));
    return await tested.Create(new LianeRequest(null, name, wayPoints.ToImmutableList(), false, true, DayOfWeekFlag.All, timeConstraints, null, null, null, null));
  }
}