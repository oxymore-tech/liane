using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Community;
using Liane.Service.Internal.User;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;
using LianeRequest = Liane.Api.Community.LianeRequest;
using Match = Liane.Api.Community.Match;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeServiceImplTest : BaseIntegrationTest
{
  private ILianeService tested = null!;
  private MockCurrentContext currentContext = null!;

  private DbUser gugu = null!;
  private DbUser jayBee = null!;
  private DbUser mathilde = null!;
  private DbUser siloe = null!;
  private DbUser gargamel = null!;
  private DbUser caramelo = null!;
  private DbUser bertrand = null!;
  private DbUser samuel = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tested = ServiceProvider.GetRequiredService<LianeServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  [SetUp]
  public void SetupDefaultUsers()
  {
    gugu = Fakers.FakeDbUsers[0];
    jayBee = Fakers.FakeDbUsers[1];
    mathilde = Fakers.FakeDbUsers[2];
    siloe = Fakers.FakeDbUsers[3];
    gargamel = Fakers.FakeDbUsers[4];
    caramelo = Fakers.FakeDbUsers[5];
    bertrand = Fakers.FakeDbUsers[6];
    samuel = Fakers.FakeDbUsers[7];
  }

  private async Task<(LianeRequest lianeGugu, LianeRequest lianeJayBee, LianeRequest lianeMathilde, LianeRequest lianeSiloe, LianeRequest lianeGargamel, LianeRequest lianeCaramelo, LianeRequest
    lianeBertrand, LianeRequest lianeSamuel)> SetupDefaultLianes()
  {
    var lianeGugu = await CreateLianeRequest(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);
    var lianeJayBee = await CreateLianeRequest(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);
    var lianeMathilde = await CreateLianeRequest(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise, weekDays: DayOfWeekFlag.All);
    var lianeSiloe = await CreateLianeRequest(siloe, "Bahut", LabeledPositions.IspagnacParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);
    var lianeGargamel = await CreateLianeRequest(gargamel, "Les stroumpfs", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking, weekDays: DayOfWeekFlag.All);
    var lianeCaramelo = await CreateLianeRequest(caramelo, "Bonbons", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise, weekDays: DayOfWeekFlag.All);
    var lianeBertrand = await CreateLianeRequest(bertrand, "LO", LabeledPositions.Alan, LabeledPositions.Toulouse, weekDays: DayOfWeekFlag.All);
    var lianeSamuel = await CreateLianeRequest(samuel, "LO 2", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane, weekDays: DayOfWeekFlag.All);
    return (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, lianeGargamel, lianeCaramelo, lianeBertrand, lianeSamuel);
  }

  [Test]
  public async Task GuguShouldMatchLianes()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    currentContext.SetCurrentUser(gugu);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    var lianeMatch = actual[0];
    lianeGugu.WayPoints.Select(p => p.Id).AreRefEquivalent(lianeMatch.LianeRequest.WayPoints);

    lianeMatch.Matches
      .AssertDeepEqual(
        new Match.Single("Pain", lianeJayBee.Id, jayBee.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f),
        new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f),
        new Match.Single("Alodr", lianeMathilde.Id, mathilde.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.5349006f)
      );
  }

  [Test]
  public async Task MathildeShouldMatchLianes()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    currentContext.SetCurrentUser(mathilde);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    var lianeMatch = actual[0];
    Assert.AreEqual(lianeMathilde.WayPoints.Select(p => (Ref<RallyingPoint>)p.Id), lianeMatch.LianeRequest.WayPoints);

    lianeMatch.Matches
      .AssertDeepEqual(
        new Match.Single("Pain", lianeJayBee.Id, jayBee.Id, DayOfWeekFlag.All, LabeledPositions.FloracFormares.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.8810778f),
        new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.IspagnacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.61637884f),
        new Match.Single("Boulot", lianeGugu.Id, gugu.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.5739291f)
      );
  }

  [Test]
  public async Task MathildeShouldMatchEnabledLianes()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    currentContext.SetCurrentUser(jayBee);
    await tested.SetEnabled(lianeJayBee.Id, false);

    currentContext.SetCurrentUser(mathilde);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    var lianeMatch = actual[0];
    Assert.AreEqual(lianeMathilde.WayPoints.Select(p => (Ref<RallyingPoint>)p.Id), lianeMatch.LianeRequest.WayPoints);

    lianeMatch.Matches
      .AssertDeepEqual(
        new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.IspagnacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.61637884f),
        new Match.Single("Boulot", lianeGugu.Id, gugu.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.5739291f)
      );
  }

  [Test]
  public async Task ExactSameLianeRequestShouldMatch()
  {
    var (_, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    await CreateLianeRequest(gugu, "Pain 2", LabeledPositions.Cocures, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);

    currentContext.SetCurrentUser(gugu);
    var actual = await tested.List();
    Assert.AreEqual(2, actual.Count);

    actual[1].Matches
      .AssertDeepEqual(
        new Match.Single("Pain", lianeJayBee.Id, jayBee.Id, DayOfWeekFlag.All, LabeledPositions.Cocures.AsRef(), LabeledPositions.Mende.AsRef(), 1f),
        new Match.Single("Alodr", lianeMathilde.Id, mathilde.Id, DayOfWeekFlag.All, LabeledPositions.FloracFormares.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.6964716f),
        new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.IspagnacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.68868893f)
      );
  }

  [Test]
  public async Task GuguShouldJoinANewLianeByJoiningAMatch()
  {
    var (_, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    // Gugu join JayBee : a new liane is created
    Api.Community.Liane joinedLiane;
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = (list[0].Matches.First() as Match.Single)!.LianeRequest;
      joinedLiane = await tested.JoinNew(from, to);

      Assert.AreEqual(gugu.Id, joinedLiane.CreatedBy.Id);
      ImmutableList.Create(gugu.Id, jayBee.Id)
        .AreRefEquivalent(joinedLiane.Members.Select(m => m.User));
    }

    // Gugu liane request is attached to the liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      list[0].JoindedLianes
        .AssertDeepEqual(
          new Match.Group("Pain", joinedLiane,
            ImmutableList.Create(new Match.Single("Pain", lianeJayBee.Id, jayBee.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f)),
            DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f)
        );
      list[0].Matches
        .AssertDeepEqual(
          new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f),
          new Match.Single("Alodr", lianeMathilde.Id, mathilde.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.5349006f)
        );
    }
  }

  [Test]
  public async Task GuguSeeJoinedLianesEvenIfRequestIsDisabled()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    // Gugu join JayBee : a new liane is created
    Api.Community.Liane joinedLiane;
    {
      currentContext.SetCurrentUser(gugu);
      joinedLiane = await tested.JoinNew(lianeGugu, lianeJayBee);
    }

    // jaybee disable its liane
    {
      currentContext.SetCurrentUser(jayBee);
      await tested.SetEnabled(lianeJayBee.Id, false);
    }

    // Gugu liane request is attached to the liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      list[0].JoindedLianes
        .AssertDeepEqual(
          new Match.Group("Pain", joinedLiane,
            ImmutableList.Create(new Match.Single("Pain", lianeJayBee.Id, jayBee.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f)),
            DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f)
        );
      list[0].Matches
        .AssertDeepEqual(
          new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f),
          new Match.Single("Alodr", lianeMathilde.Id, mathilde.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.5349006f)
        );
    }
  }

  [Test]
  public async Task GuguMatchesChangeWhenJaybeeHavedJoinedMathildeLiane()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane exisitingLiane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = (list[0].Matches.First() as Match.Single)!;
      exisitingLiane = await tested.JoinNew(from, to.LianeRequest);

      Assert.AreEqual("Pain", exisitingLiane.Name);
    }

    // Mathilde does't appears anymore in jaybee matches
    {
      currentContext.SetCurrentUser(jayBee);
      var list = await tested.List();
      list[0].JoindedLianes
        .AssertDeepEqual(
          new Match.Group("Pain", exisitingLiane,
            ImmutableList.Create(new Match.Single("Alodr", lianeMathilde.Id, mathilde.Id, DayOfWeekFlag.All, LabeledPositions.FloracFormares.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(),
              0.6964716f)),
            DayOfWeekFlag.All, LabeledPositions.FloracFormares.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.6964716f)
        );
      list[0].Matches
        .AssertDeepEqual(
          new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.IspagnacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.68868893f),
          new Match.Single("Boulot", lianeGugu.Id, gugu.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.6551334f)
        );
    }

    // JayBee does't appears anymore in mathilde matches
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      Assert.AreEqual(2, list[0].Matches.Count);
      list[0].JoindedLianes
        .AssertDeepEqual(
          new Match.Group("Pain", exisitingLiane,
            ImmutableList.Create(new Match.Single("Pain", lianeJayBee.Id, jayBee.Id, DayOfWeekFlag.All, LabeledPositions.FloracFormares.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(),
              0.8810778f)),
            DayOfWeekFlag.All, LabeledPositions.FloracFormares.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.8810778f)
        );
      list[0].Matches
        .AssertDeepEqual(
          new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.IspagnacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.61637884f),
          new Match.Single("Boulot", lianeGugu.Id, gugu.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.5739291f)
        );
    }

    // Jaybee/Mathilde liane now appears in a liane in gugu matches
    {
      currentContext.SetCurrentUser(gugu);
      var actual = await tested.List();

      var lianeMatch = actual[0];
      Assert.AreEqual(lianeGugu.Id, lianeMatch.LianeRequest.Id);
      Assert.IsEmpty(lianeMatch.JoindedLianes);
      lianeMatch.Matches
        .AssertDeepEqual(
          new Match.Group("Pain", exisitingLiane,
            ImmutableList.Create(
              new Match.Single("Pain", lianeJayBee.Id, jayBee.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f),
              new Match.Single("Alodr", lianeMathilde.Id, mathilde.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.BalsiegeParkingEglise.AsRef(), 0.5349006f)
            ),
            DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f),
          new Match.Single("Bahut", lianeSiloe.Id, siloe.Id, DayOfWeekFlag.All, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f)
        );
    }
  }

  [Test]
  public async Task GuguShouldJoinAnExistingLianeByJoiningAMatch()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane exisitingLiane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = (list[0].Matches.First() as Match.Single)!.LianeRequest;
      exisitingLiane = await tested.JoinNew(from, to);
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      var joinedLiane = await tested.Join(lianeGugu.Id, exisitingLiane.Id);

      CollectionAssert.AreEquivalent(ImmutableList.Create(
        (jayBee.Id, lianeJayBee.Id),
        (mathilde.Id, lianeMathilde.Id),
        (gugu.Id, lianeGugu.Id)
      ), joinedLiane.Members.Select(m => (m.User.Id, m.LianeRequest.Id)));
    }
  }

  [Test]
  public async Task WhenTheLastMemberLeaveALianeTheLianeIsDeleted()
  {
    await SetupDefaultLianes();

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane exisitingLiane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = (list[0].Matches.First() as Match.Single)!.LianeRequest;
      exisitingLiane = await tested.JoinNew(from, to);
    }

    // Gugu join JayBee : gugu join the existing liane
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      liane = await tested.Join(from, exisitingLiane);
    }

    // Gugu liane request is attached to the joined liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();
      CollectionAssert.AreEquivalent(ImmutableList.Create(liane.Id), list[0].JoindedLianes.Select(j => j.Liane.Id));
    }

    // Gugu leave the liane
    {
      currentContext.SetCurrentUser(gugu);
      var left = await tested.Leave(exisitingLiane);
      Assert.IsTrue(left);
      var list = await tested.List();
      CollectionAssert.IsEmpty(list[0].JoindedLianes);
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
  }

  [Test]
  public async Task ShouldNotSendAMessageToALeftLiane()
  {
    await SetupDefaultLianes();

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = (list[0].Matches.First() as Match.Single)!.LianeRequest;
      liane = await tested.JoinNew(from, to);
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = (list[0].Matches.First() as Match.Group)!.Liane;
      Assert.IsNotNull(to);
      await tested.Join(from, to);
    }

    // Bertrand cannot send a message in this liane
    {
      currentContext.SetCurrentUser(bertrand);
      Assert.ThrowsAsync<UnauthorizedAccessException>(() => tested.SendMessage(liane, "Hello there !"));
    }
  }

  [Test]
  public async Task ShouldChatInALiane()
  {
    await SetupDefaultLianes();

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = (list[0].Matches.First() as Match.Single)!.LianeRequest;
      liane = await tested.JoinNew(from, to);
    }

    // Mathilde send a message in the liane
    {
      currentContext.SetCurrentUser(mathilde);
      var message = await tested.SendMessage(liane, "Salut JB, ça te dit de covoiturer demain ?");
      Assert.NotNull(message);
    }

    // Jaybee list all messages
    {
      currentContext.SetCurrentUser(jayBee);
      {
        var unread = await tested.GetUnreadLianes();
        CollectionAssert.AreEquivalent(ImmutableList.Create(
          (liane.Id, 1)
        ), unread.Select(l => (l.Key.Id, l.Value)));
      }
      var messages = await tested.GetMessages(liane, new Pagination(SortAsc: false));
      Assert.AreEqual(1, messages.TotalCount);
      CollectionAssert.AreEquivalent(
        ImmutableList.Create(
          (mathilde.Id, "Salut JB, ça te dit de covoiturer demain ?")
        ), messages.Data.Select(ToTuple)
      );
      {
        var unread = await tested.GetUnreadLianes();
        Assert.IsEmpty(unread.Select(l => (l.Key.Id, l.Value)));
      }
      await tested.SendMessage(liane, "Bonjour Mathilde, je suis partant !");
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      var from = list[0].LianeRequest;
      var to = (list[0].Matches.First() as Match.Group)!.Liane;
      await tested.Join(from, to);
    }

    // Gugu send a message in the liane
    {
      currentContext.SetCurrentUser(gugu);
      var message = await tested.SendMessage(liane, "Bonjour à tous 🚘, vroum !");
      Assert.NotNull(message);
      await tested.SendMessage(liane, "Comment ça marche ici ?");

      currentContext.SetCurrentUser(mathilde);
      await tested.SendMessage(liane, "Bienvenue gugu, tu as bien fait de nous rejoindre, avec Jb on fait la route demain matin !");

      currentContext.SetCurrentUser(gugu);
      await tested.SendMessage(liane, "Super je dois aller à Mende demain pour 9h30");
    }

    ImmutableList<LianeMessage> allMessages;
    // Jaybee list all messages
    {
      currentContext.SetCurrentUser(jayBee);
      {
        var unread = await tested.GetUnreadLianes();
        CollectionAssert.AreEquivalent(ImmutableList.Create(
          (liane.Id, 5)
        ), unread.Select(l => (l.Key.Id, l.Value)));
      }
      var messages = await tested.GetMessages(liane, new Pagination(SortAsc: false));
      Assert.AreEqual(6, messages.TotalCount);
      CollectionAssert.AreEquivalent(
        ImmutableList.Create(
          (gugu.Id, "Super je dois aller à Mende demain pour 9h30"),
          (mathilde.Id, "Bienvenue gugu, tu as bien fait de nous rejoindre, avec Jb on fait la route demain matin !"),
          (gugu.Id, "Comment ça marche ici ?"),
          (gugu.Id, "Bonjour à tous 🚘, vroum !"),
          (jayBee.Id, "Bonjour Mathilde, je suis partant !"),
          (mathilde.Id, "Salut JB, ça te dit de covoiturer demain ?")
        ), messages.Data.Select(ToTuple)
      );
      allMessages = messages.Data;
    }

    // Gugu list all messages
    {
      currentContext.SetCurrentUser(gugu);
      var messages = await tested.GetMessages(liane, new Pagination(SortAsc: false));
      Assert.AreEqual(4, messages.TotalCount);
      CollectionAssert.AreEquivalent(
        ImmutableList.Create(
          (gugu.Id, "Super je dois aller à Mende demain pour 9h30"),
          (mathilde.Id, "Bienvenue gugu, tu as bien fait de nous rejoindre, avec Jb on fait la route demain matin !"),
          (gugu.Id, "Comment ça marche ici ?"),
          (gugu.Id, "Bonjour à tous 🚘, vroum !")
        ), messages.Data.Select(ToTuple)
      );
      Assert.IsNull(messages.Next);
    }

    // Jaybee list messages with pagination
    {
      currentContext.SetCurrentUser(jayBee);
      var messages = await tested.GetMessages(liane, new Pagination(null, 3, SortAsc: false));
      Assert.AreEqual(6, messages.TotalCount);
      CollectionAssert.AreEquivalent(
        ImmutableList.Create(
          (gugu.Id, "Super je dois aller à Mende demain pour 9h30"),
          (mathilde.Id, "Bienvenue gugu, tu as bien fait de nous rejoindre, avec Jb on fait la route demain matin !"),
          (gugu.Id, "Comment ça marche ici ?")
        ), messages.Data.Select(ToTuple)
      );
      Assert.AreEqual(allMessages[3].ToCursor(), messages.Next);
    }

    // Jaybee list messages with pagination
    {
      currentContext.SetCurrentUser(jayBee);
      var messages = await tested.GetMessages(liane, new Pagination(allMessages[3].ToCursor(), 3, SortAsc: false));
      Assert.AreEqual(6, messages.TotalCount);
      CollectionAssert.AreEquivalent(
        ImmutableList.Create(
          (gugu.Id, "Bonjour à tous 🚘, vroum !"),
          (jayBee.Id, "Bonjour Mathilde, je suis partant !"),
          (mathilde.Id, "Salut JB, ça te dit de covoiturer demain ?")
        ), messages.Data.Select(ToTuple)
      );
      Assert.IsNull(messages.Next);
    }
  }

  [Test]
  public async Task ShouldMatchLianesWithTimeConstraints()
  {
    var lianeGugu = await CreateLianeRequest(gugu, "Boulot", LabeledPositions.BlajouxParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.Monday | DayOfWeekFlag.Tuesday | DayOfWeekFlag.Thursday);
    var lianeJayBee = await CreateLianeRequest(jayBee, "Pain", LabeledPositions.Cocures, LabeledPositions.Mende, weekDays: DayOfWeekFlag.Monday);
    var lianeMathilde = await CreateLianeRequest(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise, weekDays: DayOfWeekFlag.Wednesday);

    currentContext.SetCurrentUser(gugu);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    var lianeMatch = actual[0];
    lianeGugu.WayPoints.Select(p => p.Id).AreRefEquivalent(lianeMatch.LianeRequest.WayPoints);

    lianeMatch.Matches
      .AssertDeepEqual(
        new Match.Single("Pain", lianeJayBee.Id, jayBee.Id, DayOfWeekFlag.Monday, LabeledPositions.QuezacParking.AsRef(), LabeledPositions.Mende.AsRef(), 0.77242357f)
      );
  }

  private async Task<LianeRequest> CreateLianeRequest(DbUser user, string name, Ref<RallyingPoint> from, Ref<RallyingPoint> to, Ref<RallyingPoint>? intermediate = null,
    DayOfWeekFlag weekDays = default, TimeOnly? leavesAt = null,
    TimeOnly? returnsAt = null)
  {
    currentContext.SetCurrentUser(user);
    var timeConstraints = new List<TimeConstraint>();
    if (leavesAt.HasValue)
    {
      timeConstraints.Add(new TimeConstraint(new TimeRange(leavesAt.Value, null), from, default));
    }

    if (returnsAt.HasValue)
    {
      timeConstraints.Add(new TimeConstraint(new TimeRange(returnsAt.Value, null), to, default));
    }

    var wayPoints = intermediate is null ? ImmutableList.Create(from, to) : ImmutableList.Create(from, intermediate, to);
    return await tested.Create(new LianeRequest(null, name, wayPoints, false, true, weekDays, timeConstraints.ToImmutableList(), true, null, null));
  }

  private static (string User, string Text) ToTuple(LianeMessage message) => message switch
  {
    LianeMessage.Chat chat => (chat.CreatedBy.Id, chat.Text),
    LianeMessage.Trip trip => (trip.CreatedBy.Id, "!!NOUVEAU TRIP PROPOSE!!"),
    _ => throw new ArgumentOutOfRangeException(nameof(message))
  };
}