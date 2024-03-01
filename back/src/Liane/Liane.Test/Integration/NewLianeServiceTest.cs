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
    var lianeGugu = await CreateLiane(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende);

    var jayBee = Fakers.FakeDbUsers[1];
    var lianeJayBee = await CreateLiane(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);

    var mathilde = Fakers.FakeDbUsers[2];
    var lianeMathilde = await CreateLiane(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise);

    var siloe = Fakers.FakeDbUsers[3];
    var lianeSiloe = await CreateLiane(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende);

    var gargamel = Fakers.FakeDbUsers[4];
    await CreateLiane(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking);

    var caramelo = Fakers.FakeDbUsers[5];
    await CreateLiane(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise);

    var bertrand = Fakers.FakeDbUsers[6];
    await CreateLiane(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse);

    var samuel = Fakers.FakeDbUsers[7];
    await CreateLiane(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane);

    currentContext.SetCurrentUser(gugu);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);
    Assert.IsNull(actual[0].Liane);

    Assert.AreEqual(lianeGugu.WayPoints.Select(p => (Ref<RallyingPoint>)p.Id), actual[0].LianeRequest.WayPoints);
    Assert.AreEqual(3, actual[0].Matches.Count);

    Assert.AreEqual(lianeJayBee.Id, actual[0].Matches[0].LianeRequest.Id);
    Assert.AreEqual(LabeledPositions.QuezacParking.Id, actual[0].Matches[0].Pickup?.Id);
    Assert.AreEqual(LabeledPositions.Mende.Id, actual[0].Matches[0].Deposit?.Id);

    Assert.AreEqual(lianeSiloe.Id, actual[0].Matches[1].LianeRequest.Id);
    Assert.AreEqual(LabeledPositions.QuezacParking.Id, actual[0].Matches[1].Pickup?.Id);
    Assert.AreEqual(LabeledPositions.Mende.Id, actual[0].Matches[1].Deposit?.Id);

    Assert.AreEqual(lianeMathilde.Id, actual[0].Matches[2].LianeRequest.Id);
    Assert.AreEqual(LabeledPositions.QuezacParking.Id, actual[0].Matches[2].Pickup?.Id);
    Assert.AreEqual(LabeledPositions.BalsiegeParkingEglise.Id, actual[0].Matches[2].Deposit?.Id);
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
    await CreateLiane(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking);

    var caramelo = Fakers.FakeDbUsers[5];
    await CreateLiane(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise);

    var bertrand = Fakers.FakeDbUsers[6];
    await CreateLiane(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse);

    var samuel = Fakers.FakeDbUsers[7];
    await CreateLiane(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane);

    currentContext.SetCurrentUser(mathilde);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    Assert.AreEqual(lianeMathilde.WayPoints.Select(p => (Ref<RallyingPoint>)p.Id), actual[0].LianeRequest.WayPoints);
    Assert.AreEqual(3, actual[0].Matches.Count);

    Assert.AreEqual(lianeJayBee.Id, actual[0].Matches[0].LianeRequest.Id);
    Assert.AreEqual(LabeledPositions.FloracFormares.Id, actual[0].Matches[0].Pickup?.Id);
    Assert.AreEqual(LabeledPositions.BalsiegeParkingEglise.Id, actual[0].Matches[0].Deposit?.Id);

    Assert.AreEqual(lianeSiloe.Id, actual[0].Matches[1].LianeRequest.Id);
    Assert.AreEqual(LabeledPositions.IspagnacParking.Id, actual[0].Matches[1].Pickup?.Id);
    Assert.AreEqual(LabeledPositions.BalsiegeParkingEglise.Id, actual[0].Matches[1].Deposit?.Id);

    Assert.AreEqual(lianeGugu.Id, actual[0].Matches[2].LianeRequest.Id);
    Assert.AreEqual(LabeledPositions.QuezacParking.Id, actual[0].Matches[2].Pickup?.Id);
    Assert.AreEqual(LabeledPositions.BalsiegeParkingEglise.Id, actual[0].Matches[2].Deposit?.Id);
  }

  [Test]
  public async Task ExactSameLianeRequestShouldMatch()
  {
    var gugu = Fakers.FakeDbUsers[0];
    await CreateLiane(gugu, "Boulot", LabeledPositions.Cocures, LabeledPositions.Mende);

    var jayBee = Fakers.FakeDbUsers[1];
    var lianeJayBee = await CreateLiane(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);

    currentContext.SetCurrentUser(gugu);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);
    Assert.AreEqual(1, actual[0].Matches.Count);

    Assert.AreEqual(lianeJayBee.Id, actual[0].Matches[0].LianeRequest.Id);
    Assert.AreEqual(LabeledPositions.Cocures.Id, actual[0].Matches[0].Pickup?.Id);
    Assert.AreEqual(LabeledPositions.Mende.Id, actual[0].Matches[0].Deposit?.Id);
    Assert.AreEqual(1, actual[0].Matches[0].Score);
  }

  [Test]
  public async Task GuguShouldJoinANewLianeByJoiningAMatch()
  {
    var gugu = Fakers.FakeDbUsers[0];
    await CreateLiane(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende);

    var jayBee = Fakers.FakeDbUsers[1];
    await CreateLiane(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);

    var mathilde = Fakers.FakeDbUsers[2];
    await CreateLiane(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise);

    var siloe = Fakers.FakeDbUsers[3];
    await CreateLiane(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende);

    var gargamel = Fakers.FakeDbUsers[4];
    await CreateLiane(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking);

    var caramelo = Fakers.FakeDbUsers[5];
    await CreateLiane(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise);

    var bertrand = Fakers.FakeDbUsers[6];
    await CreateLiane(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse);

    var samuel = Fakers.FakeDbUsers[7];
    await CreateLiane(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane);

    // Gugu join JayBee : a new liane is created
    Api.Community.Liane joinedLiane;
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      joinedLiane = await tested.Join(from, to);

      Assert.AreEqual(gugu.Id, joinedLiane.CreatedBy.Id);
      CollectionAssert.AreEquivalent(ImmutableList.Create(gugu.Id, jayBee.Id), joinedLiane.Members.Select(m => m.User.Id));
    }

    // Gugu liane request is attached to the liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();
      
      Assert.AreEqual(joinedLiane.Id, list[0].Liane!.Id);
      Assert.AreEqual(gugu.Id, list[0].Liane!.CreatedBy.Id);
      CollectionAssert.AreEquivalent(ImmutableList.Create(gugu.Id, jayBee.Id), list[0].Liane!.Members.Select(m => m.User.Id));
    }
  }

  [Test]
  public async Task GuguShouldJoinAnExistingLianeByJoiningAMatch()
  {
    var gugu = Fakers.FakeDbUsers[0];
    await CreateLiane(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende);

    var jayBee = Fakers.FakeDbUsers[1];
    await CreateLiane(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);

    var mathilde = Fakers.FakeDbUsers[2];
    await CreateLiane(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise);

    var siloe = Fakers.FakeDbUsers[3];
    await CreateLiane(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende);

    var gargamel = Fakers.FakeDbUsers[4];
    await CreateLiane(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking);

    var caramelo = Fakers.FakeDbUsers[5];
    await CreateLiane(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise);

    var bertrand = Fakers.FakeDbUsers[6];
    await CreateLiane(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse);

    var samuel = Fakers.FakeDbUsers[7];
    await CreateLiane(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane);

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane exisitingLiane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      exisitingLiane = await tested.Join(from, to);
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      var liane = await tested.Join(from, to);

      Assert.AreEqual(exisitingLiane.Id, liane.Id);
      Assert.AreEqual(mathilde.Id, exisitingLiane.CreatedBy.Id);
      CollectionAssert.AreEquivalent(ImmutableList.Create(mathilde.Id, jayBee.Id, gugu.Id), liane.Members.Select(m => m.User.Id));
    }
  }

  [Test]
  public async Task WhenTheLastMemberLeaveALianeTheLianeIsDeleted()
  {
    // setup
    var gugu = Fakers.FakeDbUsers[0];
    await CreateLiane(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende);

    var jayBee = Fakers.FakeDbUsers[1];
    await CreateLiane(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);

    var mathilde = Fakers.FakeDbUsers[2];
    await CreateLiane(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise);

    var siloe = Fakers.FakeDbUsers[3];
    await CreateLiane(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende);

    var gargamel = Fakers.FakeDbUsers[4];
    await CreateLiane(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking);

    var caramelo = Fakers.FakeDbUsers[5];
    await CreateLiane(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise);

    var bertrand = Fakers.FakeDbUsers[6];
    await CreateLiane(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse);

    var samuel = Fakers.FakeDbUsers[7];
    await CreateLiane(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane);

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane exisitingLiane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      exisitingLiane = await tested.Join(from, to);
    }

    // Gugu join JayBee : gugu join the existing liane
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      liane = await tested.Join(from, to);
    }

    // Gugu liane request is attached to the joined liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();
      Assert.AreEqual(liane.Id, list[0].Liane?.Id);
    }

    // Gugu leave the liane
    {
      currentContext.SetCurrentUser(gugu);
      var left = await tested.Leave(exisitingLiane);
      Assert.IsTrue(left);
    }
    
    // Gugu leave the liane
    {
      currentContext.SetCurrentUser(gugu);
      var left = await tested.Leave(exisitingLiane);
      Assert.IsFalse(left);
    }

    // Jaybee leave the liane
    {
      currentContext.SetCurrentUser(jayBee);
      var left = await tested.Leave(exisitingLiane);
      Assert.IsTrue(left);
    }

    // Jaybee leave the liane
    {
      currentContext.SetCurrentUser(jayBee);
      var left = await tested.Leave(exisitingLiane);
      Assert.IsFalse(left);
    }

    // Gugu liane request is detached from the liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();
      Assert.IsNull(list[0].Liane?.Id);
    }
  }

  private async Task<LianeRequest> CreateLiane(DbUser gugu, string name, params Ref<RallyingPoint>[] wayPoints)
  {
    currentContext.SetCurrentUser(gugu);
    var timeConstraints = ImmutableList.Create(new TimeConstraint(new TimeRange(new TimeOnly(8, 0), null), wayPoints[0], DayOfWeekFlag.All));
    return await tested.Create(new LianeRequest(null, name, wayPoints.ToImmutableList(), false, true, DayOfWeekFlag.All, timeConstraints, null, null, null, null));
  }
}