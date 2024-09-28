using System;
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
using LianeMatch = Liane.Api.Community.LianeMatch;
using LianeRequest = Liane.Api.Community.LianeRequest;
using LianeState = Liane.Api.Community.LianeState;
using Match = Liane.Api.Community.Match;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeServiceImplTest : BaseIntegrationTest
{
  private static readonly TimeRange DefaultTimeRange = new(new TimeOnly(9, 0), new TimeOnly(18, 0));

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
    var list = await tested.List();

    AssertMatchesEquals(list,
      new LianeMatch(lianeGugu, new LianeState.Detached(ImmutableList.Create(
        new Match(lianeJayBee.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeJayBee.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.772423565f,
          false),
        new Match(lianeSiloe.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeSiloe.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.772423565f,
          false),
        new Match(lianeMathilde.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeMathilde.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking,
          LabeledPositions.BalsiegeParkingEglise,
          0.534900606f,
          false)
      ))));
  }

  [Test]
  public async Task MathildeShouldMatchLianes()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    currentContext.SetCurrentUser(mathilde);
    var actual = await tested.List();
    Assert.AreEqual(1, actual.Count);

    var lianeMatch = actual[0];
    lianeMathilde.WayPoints.AreRefEquivalent(lianeMatch.LianeRequest.WayPoints);

    lianeMatch.State
      .AssertDeepEqual(
        new LianeState.Detached(ImmutableList.Create(
          new Match(lianeJayBee.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeJayBee.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.FloracFormares, LabeledPositions.BalsiegeParkingEglise,
            0.8810778f, false),
          new Match(lianeSiloe.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeSiloe.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.IspagnacParking, LabeledPositions.BalsiegeParkingEglise,
            0.61637884f, false),
          new Match(lianeGugu.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeGugu.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.BalsiegeParkingEglise,
            0.5739291f, false)
        ))
      );
  }

  [Test]
  public async Task MathildeShouldMatchEnabledLianes()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    currentContext.SetCurrentUser(jayBee);
    await tested.Update(lianeJayBee.Id, lianeJayBee with { IsEnabled = false });

    currentContext.SetCurrentUser(mathilde);
    var list = await tested.List();

    AssertMatchesEquals(list,
      new LianeMatch(lianeMathilde, new LianeState.Detached(ImmutableList.Create(
        new Match(lianeSiloe.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeSiloe.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.IspagnacParking, LabeledPositions.BalsiegeParkingEglise,
          0.61637884f, false),
        new Match(lianeGugu.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeGugu.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.BalsiegeParkingEglise, 0.5739291f,
          false)
      ))));
  }

  [Test]
  public async Task ExactSameLianeRequestShouldMatch()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    var lianePain2 = await CreateLianeRequest(gugu, "Pain 2", LabeledPositions.Cocures, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);

    currentContext.SetCurrentUser(gugu);
    var list = await tested.List();

    AssertMatchesEquals(list,
      new LianeMatch(lianeGugu, new LianeState.Detached(ImmutableList.Create(
        new Match(lianeJayBee.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeJayBee.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.772423565f,
          false),
        new Match(lianeSiloe.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeSiloe.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.772423565f,
          false),
        new Match(lianeMathilde.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeMathilde.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking,
          LabeledPositions.BalsiegeParkingEglise,
          0.534900606f,
          false)
      ))),
      new LianeMatch(lianePain2, new LianeState.Detached(ImmutableList.Create(
        new Match(lianeJayBee.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeJayBee.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.Cocures, LabeledPositions.Mende, 1f, false),
        new Match(lianeMathilde.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeMathilde.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.FloracFormares,
          LabeledPositions.BalsiegeParkingEglise,
          0.6964716f,
          false),
        new Match(lianeSiloe.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeSiloe.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.IspagnacParking, LabeledPositions.Mende, 0.68868893f,
          false)
      )))
    );
  }

  [Test]
  public async Task GuguShouldJoinANewLianeByJoiningAMatch()
  {
    var (lianeGugu, lianeJayBee, _, _, _, _, _, _) = await SetupDefaultLianes();

    // Gugu join JayBee : a new liane is created
    Api.Community.Liane joinedLiane;
    {
      currentContext.SetCurrentUser(gugu);

      await tested.JoinRequest(lianeGugu, lianeJayBee.Id);
      joinedLiane = await tested.Accept(lianeGugu, lianeJayBee.Id);

      ImmutableList.Create(gugu.Id, jayBee.Id)
        .AreRefEquivalent(joinedLiane.Members.Select(m => m.User));
    }

    // Gugu liane request is attached to the liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Attached(joinedLiane))
      );
    }
  }

  [Test]
  public async Task GuguSeeJoinedLianesEvenIfRequestIsDisabled()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    // Gugu join JayBee : a new liane is created
    Api.Community.Liane joinedLiane;
    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeGugu, lianeJayBee.Id);
      joinedLiane = await tested.Accept(lianeGugu, lianeJayBee.Id);
    }

    // jaybee disable its liane request
    var disabledJayBeeLianeRequest = lianeJayBee with { IsEnabled = false };
    {
      currentContext.SetCurrentUser(jayBee);
      await tested.Update(lianeJayBee.Id, disabledJayBeeLianeRequest);
    }

    // mathilde disable its liane request
    {
      currentContext.SetCurrentUser(mathilde);
      await tested.Update(lianeMathilde.Id, lianeMathilde with { IsEnabled = false });
    }

    var joinedLianeUdated = joinedLiane with
    {
      Members = joinedLiane.Members.Select(m =>
      {
        if (m.User.Id == jayBee.Id)
        {
          return m with { LianeRequest = disabledJayBeeLianeRequest };
        }

        return m;
      }).ToImmutableList()
    };

    // Gugu liane request is attached to the liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Attached(joinedLianeUdated))
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
      await tested.JoinRequest(lianeMathilde, lianeJayBee.Id);
      exisitingLiane = await tested.Accept(lianeMathilde, lianeJayBee.Id);
    }

    // Mathilde is attached to jaybee now
    {
      currentContext.SetCurrentUser(jayBee);
      var list = await tested.List();

      AssertMatchesEquals(list,
        new LianeMatch(lianeJayBee, new LianeState.Attached(exisitingLiane))
      );
    }

    // JayBee is attached to jaybee mathilde now
    {
      currentContext.SetCurrentUser(mathilde);
      var list = await tested.List();

      AssertMatchesEquals(list,
        new LianeMatch(lianeMathilde, new LianeState.Attached(exisitingLiane))
      );
    }

    // Jaybee/Mathilde liane now appears in a liane in gugu matches
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Detached(
          ImmutableList.Create(
            new Match(exisitingLiane.Id, 2, ImmutableList.Create<Ref<LianeRequest>>(lianeJayBee.Id, lianeMathilde.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking,
              LabeledPositions.Mende, 0.77242357f, false),
            new Match(lianeSiloe.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeSiloe.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende,
              Score: 0.77242357f, false)
          )
        ))
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
      await tested.JoinRequest(lianeMathilde, lianeJayBee.Id);
      exisitingLiane = await tested.Accept(lianeMathilde, lianeJayBee.Id);
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeGugu, exisitingLiane.Id);
      var joinedLiane = await tested.Accept(lianeGugu, exisitingLiane.Id);

      CollectionAssert.AreEquivalent(ImmutableList.Create(
        (jayBee.Id, lianeJayBee.Id),
        (mathilde.Id, lianeMathilde.Id),
        (gugu.Id, lianeGugu.Id)
      ), joinedLiane.Members.Select(m => (m.User.Id, m.LianeRequest.IdAsGuid())));
    }
  }

  [Test]
  public async Task WhenTheLastMemberLeaveALianeTheLianeIsDeleted()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane exisitingLiane;
    {
      currentContext.SetCurrentUser(mathilde);
      await tested.JoinRequest(lianeMathilde, lianeJayBee.Id);
      exisitingLiane = await tested.Accept(lianeMathilde, lianeJayBee.Id);
    }

    // Gugu join JayBee : gugu join the existing liane
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeGugu, lianeJayBee.Id);
      liane = await tested.Accept(lianeGugu, lianeJayBee.Id);
      Assert.AreEqual(liane.Id, exisitingLiane.Id);
    }

    // Gugu liane request is attached to the joined liane
    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Attached(liane))
      );
    }

    // Gugu leave the liane
    {
      currentContext.SetCurrentUser(gugu);
      var left = await tested.Leave(exisitingLiane);
      Assert.IsTrue(left);
      var list = await tested.List();

      Assert.IsInstanceOf<LianeState.Detached>(list[0].State);
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
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(mathilde);
      await tested.JoinRequest(lianeMathilde, lianeJayBee.Id);
      liane = await tested.Accept(lianeMathilde, lianeJayBee.Id);
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeGugu, lianeJayBee.Id);
      var liane2 = await tested.Accept(lianeGugu, lianeJayBee.Id);
      Assert.AreEqual(liane.Id, liane2.Id);
      liane = liane2;
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
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    // Mathilde join JayBee : a new liane is created
    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(mathilde);
      await tested.JoinRequest(lianeMathilde, lianeJayBee.Id);
      liane = await tested.Accept(lianeMathilde, lianeJayBee.Id);
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
        ), unread.Select(l => (l.Key.IdAsGuid(), l.Value)));
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
        Assert.IsEmpty(unread.Select(l => (l.Key.IdAsGuid(), l.Value)));
      }
      await tested.SendMessage(liane, "Bonjour Mathilde, je suis partant !");
    }

    // Gugu join JayBee : gugu join the existing liane
    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeGugu, lianeJayBee.Id);
      await tested.Accept(lianeGugu, lianeJayBee.Id);
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
        ), unread.Select(l => (l.Key.IdAsGuid(), l.Value)));
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
    await CreateLianeRequest(mathilde, "Alodr", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise, weekDays: DayOfWeekFlag.Wednesday);

    currentContext.SetCurrentUser(gugu);
    var list = await tested.List();

    AssertMatchesEquals(list,
      new LianeMatch(lianeGugu, new LianeState.Detached(ImmutableList.Create(
        new Match(lianeJayBee.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeJayBee.Id), DayOfWeekFlag.Monday, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.77242357f, false)))
      ));
  }

  [Test]
  public async Task EveryRequestIsIndependant()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();
    var lianeGuguMarch = await CreateLianeRequest(gugu, "Marché", LabeledPositions.BlajouxParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.Friday | DayOfWeekFlag.Saturday);

    currentContext.SetCurrentUser(gugu);

    // Gugu join JayBee : a new liane is created
    Api.Community.Liane joinedLiane;
    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeGugu, lianeJayBee.Id);
      joinedLiane = await tested.Accept(lianeGugu, lianeJayBee.Id);
    }

    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Attached(joinedLiane)),
        new LianeMatch(lianeGuguMarch, new LianeState.Detached(ImmutableList.Create(
          new Match(lianeSiloe.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeSiloe.Id), DayOfWeekFlag.Friday | DayOfWeekFlag.Saturday, DefaultTimeRange, LabeledPositions.QuezacParking,
            LabeledPositions.Mende,
            0.77242357f, false),
          new Match(lianeMathilde.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeMathilde.Id), DayOfWeekFlag.Friday | DayOfWeekFlag.Saturday, DefaultTimeRange, LabeledPositions.QuezacParking,
            LabeledPositions.BalsiegeParkingEglise, 0.5349006f, false)
        )))
      );
    }
  }

  [Test]
  public async Task ShouldMatchNoMatterWhatDirection()
  {
    var lianeGugu = await CreateLianeRequest(gugu, "Marché Mende", LabeledPositions.BlajouxParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All, roundTrip: true);
    var lianeMathilde = await CreateLianeRequest(mathilde, "Biojour", LabeledPositions.Mende, LabeledPositions.Florac, weekDays: DayOfWeekFlag.All);

    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Detached(ImmutableList.Create(
          new Match(lianeMathilde.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeMathilde.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.Mende, LabeledPositions.QuezacParking, 0.7699512f, true)
        )))
      );
    }
  }

  [Test]
  public async Task ShouldUnjoinedRequestMustAppearInAllMatch()
  {
    var lianeGugu = await CreateLianeRequest(gugu, "Marché Mende", LabeledPositions.BlajouxParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);
    var lianeGugu2 = await CreateLianeRequest(gugu, "Marché Lundi", LabeledPositions.BlajouxParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.Monday);
    var lianeMathilde = await CreateLianeRequest(mathilde, "Biojour", LabeledPositions.Florac, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);

    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.List();


      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Detached(ImmutableList.Create(
          new Match(lianeMathilde.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeMathilde.Id), DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.77242357f, false)
        ))),
        new LianeMatch(lianeGugu2, new LianeState.Detached(ImmutableList.Create(
          new Match(lianeMathilde.Id, 0, ImmutableList.Create<Ref<LianeRequest>>(lianeMathilde.Id), DayOfWeekFlag.Monday, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.77242357f, false)
        )))
      );
    }
  }

  private async Task<LianeRequest> CreateLianeRequest(DbUser user, string name, Ref<RallyingPoint> from, Ref<RallyingPoint> to, Ref<RallyingPoint>? intermediate = null,
    DayOfWeekFlag weekDays = default,
    TimeOnly? arriveBefore = null,
    TimeOnly? returnAfter = null, bool roundTrip = false)
  {
    currentContext.SetCurrentUser(user);
    var wayPoints = intermediate is null ? ImmutableList.Create(from, to) : ImmutableList.Create(from, intermediate, to);
    return await tested.Create(new LianeRequest(default, name, wayPoints, roundTrip,
      arriveBefore ?? DefaultTimeRange.Start,
      returnAfter ?? DefaultTimeRange.End,
      true, weekDays, true, null, null));
  }

  private static (string User, string Text) ToTuple(LianeMessage message) => message.Content switch
  {
    MessageContent.Text text => (message.CreatedBy.Id, text.Value),
    MessageContent.Trip => (message.CreatedBy.Id, "!!NOUVEAU TRIP PROPOSE!!"),
    _ => throw new ArgumentOutOfRangeException(nameof(message))
  };

  private static void AssertMatchesEquals(ImmutableList<LianeMatch> list, params LianeMatch[] expected)
  {
    list.AssertDeepEqual(expected);
  }
}