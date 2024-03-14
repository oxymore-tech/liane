using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Community;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
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

  private DbUser gugu = null!;
  private DbUser jayBee = null!;
  private DbUser mathilde = null!;
  private DbUser siloe = null!;
  private DbUser gargamel = null!;
  private DbUser caramelo = null!;
  private DbUser bertrand = null!;
  private DbUser samuel = null!;

  private LianeRequest lianeGugu = null!;
  private LianeRequest lianeJayBee = null!;
  private LianeRequest lianeMathilde = null!;
  private LianeRequest lianeSiloe = null!;
  private LianeRequest lianeGargamel = null!;
  private LianeRequest lianeCaramelo = null!;
  private LianeRequest lianeBertrand = null!;
  private LianeRequest lianeSamuel = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tested = ServiceProvider.GetRequiredService<NewLianeServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  [SetUp]
  public async Task SetupDefaultLianes()
  {
    gugu = Fakers.FakeDbUsers[0];
    lianeGugu = await CreateLianeRequest(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende);

    jayBee = Fakers.FakeDbUsers[1];
    lianeJayBee = await CreateLianeRequest(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende);

    mathilde = Fakers.FakeDbUsers[2];
    lianeMathilde = await CreateLianeRequest(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise);

    siloe = Fakers.FakeDbUsers[3];
    lianeSiloe = await CreateLianeRequest(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende);

    gargamel = Fakers.FakeDbUsers[4];
    lianeGargamel = await CreateLianeRequest(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking);

    caramelo = Fakers.FakeDbUsers[5];
    lianeCaramelo = await CreateLianeRequest(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise);

    bertrand = Fakers.FakeDbUsers[6];
    lianeBertrand = await CreateLianeRequest(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse);

    samuel = Fakers.FakeDbUsers[7];
    lianeSamuel = await CreateLianeRequest(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane);
  }

  [Test]
  public async Task GuguShouldMatchLianes()
  {
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
    await CreateLianeRequest(gugu, "Pain 2", LabeledPositions.Cocures, LabeledPositions.Mende);

    currentContext.SetCurrentUser(gugu);
    var actual = await tested.List();
    Assert.AreEqual(2, actual.Count);
    Assert.AreEqual(3, actual[1].Matches.Count);

    Assert.AreEqual(lianeJayBee.Id, actual[1].Matches[0].LianeRequest.Id);
    Assert.AreEqual(jayBee.Id, actual[1].Matches[0].User.Id);
    Assert.AreEqual(LabeledPositions.Cocures.Id, actual[1].Matches[0].Pickup?.Id);
    Assert.AreEqual(LabeledPositions.Mende.Id, actual[1].Matches[0].Deposit?.Id);
    Assert.AreEqual(1, actual[1].Matches[0].Score);
  }

  [Test]
  public async Task GuguShouldJoinANewLianeByJoiningAMatch()
  {
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

  [Test]
  public async Task ShouldNotSendAMessageToALeftLiane()
  {
    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      liane = await tested.Join(from, to);
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      await tested.Join(from, to);
    }

    // Bertrand cannot send a message in this liane
    {
      currentContext.SetCurrentUser(bertrand);
      Assert.ThrowsAsync<UnauthorizedAccessException>(() => tested.SendMessage(liane, "Hello there !"));
    }
  }

  [Test]
  public async Task ShouldSendAMessageToAJoinedLiane()
  {
    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      liane = await tested.Join(from, to);
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = list[0].Matches.First(m => m.User.Id == jayBee.Id).LianeRequest;
      await tested.Join(from, to);
    }

    // Mathilde send a message in the liane
    {
      currentContext.SetCurrentUser(mathilde);
      var message = await tested.SendMessage(liane, "Hé gamin !");
      Assert.NotNull(message);
    }

    // Gugu send a message in the liane
    {
      currentContext.SetCurrentUser(gugu);
      var message = await tested.SendMessage(liane, "J'ai bien reçu ton message \ud83d\ude35\u200d\ud83d\udcab !");
      Assert.NotNull(message);
      await tested.SendMessage(liane, "2 ème message");

      currentContext.SetCurrentUser(mathilde);
      await tested.SendMessage(liane, "3 ème message !");

      currentContext.SetCurrentUser(gugu);
      await tested.SendMessage(liane, "4 ème message");
    }

    // Jaybee list all messages
    {
      currentContext.SetCurrentUser(jayBee);
      var messages = await tested.GetMessages(liane, new Pagination(null, 1, false));
      Assert.AreEqual(3, messages.TotalCount);
      CollectionAssert.AreEquivalent(
        ImmutableList.Create(
          new ChatMessage(null, gugu.Id, null, "Oui")
        ), messages.Data.Select(m => m with { Id = null, CreatedAt = null })
      );
    }
  }

  private async Task<LianeRequest> CreateLianeRequest(DbUser user, string name, params Ref<RallyingPoint>[] wayPoints)
  {
    currentContext.SetCurrentUser(user);
    var timeConstraints = ImmutableList.Create(new TimeConstraint(new TimeRange(new TimeOnly(8, 0), null), wayPoints[0], DayOfWeekFlag.All));
    return await tested.Create(new LianeRequest(null, name, wayPoints.ToImmutableList(), false, true, DayOfWeekFlag.All, timeConstraints, null, null, null, null));
  }
}