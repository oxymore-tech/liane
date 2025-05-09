using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Test.Mock;
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
public sealed class LianeTxTest : BaseIntegrationTest
{
  private static readonly TimeRange DefaultTimeRange = new(new TimeOnly(9, 0), new TimeOnly(18, 0));

  private ILianeService tested = null!;
  private MockCurrentContext currentContext = null!;
  private MockPushServiceImpl pushService = null!;
  private ILianeMessageService messageService = null!;

  private User gugu = null!;
  private User jayBee = null!;
  private User mathilde = null!;
  private User siloe = null!;
  private User gargamel = null!;
  private User caramelo = null!;
  private User bertrand = null!;
  private User samuel = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tested = ServiceProvider.GetRequiredService<ILianeService>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    pushService = ServiceProvider.GetRequiredService<MockPushServiceImpl>();
    messageService = ServiceProvider.GetRequiredService<ILianeMessageService>();
  }

  [SetUp]
  public void SetupDefaultUsers()
  {
    gugu = Fakers.FakeDbUsers[0].MapToUser();
    jayBee = Fakers.FakeDbUsers[1].MapToUser();
    mathilde = Fakers.FakeDbUsers[2].MapToUser();
    siloe = Fakers.FakeDbUsers[3].MapToUser();
    gargamel = Fakers.FakeDbUsers[4].MapToUser();
    caramelo = Fakers.FakeDbUsers[5].MapToUser();
    bertrand = Fakers.FakeDbUsers[6].MapToUser();
    samuel = Fakers.FakeDbUsers[7].MapToUser();
  }

  private async Task<(LianeRequest lianeGugu, LianeRequest lianeJayBee, LianeRequest lianeMathilde, LianeRequest lianeSiloe, LianeRequest lianeGargamel, LianeRequest lianeCaramelo, LianeRequest
    lianeBertrand, LianeRequest lianeSamuel)> SetupDefaultLianes()
  {
    var lianeGugu = await CreateLianeRequest(gugu, "Gugu", LabeledPositions.BlajouxParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);
    var lianeJayBee = await CreateLianeRequest(jayBee, "JayBee", LabeledPositions.Cocures, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);
    var lianeMathilde = await CreateLianeRequest(mathilde, "Mathilde", LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise, weekDays: DayOfWeekFlag.All);
    var lianeSiloe = await CreateLianeRequest(siloe, "Siloe", LabeledPositions.IspagnacParking, LabeledPositions.Mende, weekDays: DayOfWeekFlag.All);
    var lianeGargamel = await CreateLianeRequest(gargamel, "Gargamel", LabeledPositions.Montbrun, LabeledPositions.SaintEnimieParking, weekDays: DayOfWeekFlag.All);
    var lianeCaramelo = await CreateLianeRequest(caramelo, "Caramelo", LabeledPositions.VillefortParkingGare, LabeledPositions.LanuejolsParkingEglise, weekDays: DayOfWeekFlag.All);
    var lianeBertrand = await CreateLianeRequest(bertrand, "Bertrand", LabeledPositions.Alan, LabeledPositions.Toulouse, weekDays: DayOfWeekFlag.All);
    var lianeSamuel = await CreateLianeRequest(samuel, "Samuel", LabeledPositions.PointisInard, LabeledPositions.AireDesPyrénées, LabeledPositions.MartresTolosane, weekDays: DayOfWeekFlag.All);
    return (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, lianeGargamel, lianeCaramelo, lianeBertrand, lianeSamuel);
  }

  [Test]
  public async Task GuguShouldJoinRequestJayBee()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.Match();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Detached(ImmutableList.Create<Match>(
          new Match.Single(lianeJayBee.Id, ImmutableList.Create(jayBee), "JayBee", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.7692702f,
            false, null),
          new Match.Single(lianeSiloe.Id, ImmutableList.Create(siloe), "Siloe", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.7692702f,
            false, null),
          new Match.Single(lianeMathilde.Id, ImmutableList.Create(mathilde), "Mathilde", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking,
            LabeledPositions.BalsiegeParkingEglise,
            0.5420033f,
            false, null)
        ))));
    }

    DateTime at;
    {
      currentContext.SetCurrentUser(gugu);
      var liane = await tested.JoinRequest(lianeGugu.Id, lianeJayBee.Id);
      Assert.IsNull(liane);


      var dateTimes = pushService.AssertPush(
        jayBee.Id, "gugu souhaite rejoindre votre liane"
      );
      at = dateTimes[0];
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var list = await tested.Match();

      AssertMatchesEquals(list,
        new LianeMatch(lianeJayBee, new LianeState.Detached(ImmutableList.Create<Match>(
          new Match.Single(lianeMathilde.Id, ImmutableList.Create(mathilde), "Mathilde", DayOfWeekFlag.All, DefaultTimeRange,
            LabeledPositions.FloracFormares, LabeledPositions.BalsiegeParkingEglise, 0.704377413f, false, null),
          new Match.Single(lianeSiloe.Id, ImmutableList.Create(siloe), "Siloe", DayOfWeekFlag.All, DefaultTimeRange,
            LabeledPositions.IspagnacParking, LabeledPositions.Mende, 0.686026692f, false, null),
          new Match.Single(lianeGugu.Id, ImmutableList.Create(gugu), "Gugu", DayOfWeekFlag.All, DefaultTimeRange,
            LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.651186168f, false, new JoinRequest.Received(at))
        ))));
    }

    {
      currentContext.SetCurrentUser(gugu);
      var liane = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNull(liane);
    }

    {
      currentContext.SetCurrentUser(gugu);
      var deleted = await tested.Reject(lianeGugu.Id, lianeJayBee.Id);
      Assert.IsTrue(deleted);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var list = await tested.Match();

      AssertMatchesEquals(list,
        new LianeMatch(lianeJayBee, new LianeState.Detached(ImmutableList.Create<Match>(
          new Match.Single(lianeMathilde.Id, ImmutableList.Create(mathilde), "Mathilde", DayOfWeekFlag.All, DefaultTimeRange,
            LabeledPositions.FloracFormares, LabeledPositions.BalsiegeParkingEglise, 0.704377413f, false, null),
          new Match.Single(lianeSiloe.Id, ImmutableList.Create(siloe), "Siloe", DayOfWeekFlag.All, DefaultTimeRange,
            LabeledPositions.IspagnacParking, LabeledPositions.Mende, 0.686026692f, false, null),
          new Match.Single(lianeGugu.Id, ImmutableList.Create(gugu), "Gugu", DayOfWeekFlag.All, DefaultTimeRange,
            LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.651186168f, false, null)
        ))));
    }
  }

  [Test]
  public async Task GuguShouldJoinJayBee()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.Match();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Detached(ImmutableList.Create<Match>(
          new Match.Single(lianeJayBee.Id, ImmutableList.Create(jayBee), "JayBee", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.7692702f,
            false, null),
          new Match.Single(lianeSiloe.Id, ImmutableList.Create(siloe), "Siloe", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.7692702f,
            false, null),
          new Match.Single(lianeMathilde.Id, ImmutableList.Create(mathilde), "Mathilde", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking,
            LabeledPositions.BalsiegeParkingEglise,
            0.5420033f,
            false, null)
        ))));
    }

    {
      currentContext.SetCurrentUser(gugu);
      var l1 = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNull(l1);
    }

    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(jayBee);
      liane = (await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id))!;
    }

    pushService.AssertMessage(jayBee.Id,
      "jayBee a rejoint la liane",
      "gugu a rejoint la liane"
    );

    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.Match();

      AssertMatchesEquals(list, new LianeMatch(lianeGugu, new LianeState.Attached(liane)));
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var list = await tested.Match();

      AssertMatchesEquals(list, new LianeMatch(lianeJayBee, new LianeState.Attached(liane)));
    }
  }

  [Test]
  public async Task JayBeeRejectGuguJoinRequest()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.Match();

      AssertMatchesEquals(list,
        new LianeMatch(lianeGugu, new LianeState.Detached(ImmutableList.Create<Match>(
          new Match.Single(lianeJayBee.Id, ImmutableList.Create(jayBee), "JayBee", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.7692702f,
            false, null),
          new Match.Single(lianeSiloe.Id, ImmutableList.Create(siloe), "Siloe", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking, LabeledPositions.Mende, 0.7692702f,
            false, null),
          new Match.Single(lianeMathilde.Id, ImmutableList.Create(mathilde), "Mathilde", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.QuezacParking,
            LabeledPositions.BalsiegeParkingEglise,
            0.5420033f,
            false, null)
        ))));
    }

    {
      currentContext.SetCurrentUser(gugu);
      var l1 = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNull(l1);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var rejected = await tested.Reject(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsTrue(rejected);
    }

    pushService.AssertPush(
      jayBee.Id, "gugu souhaite rejoindre votre liane"
    );
    
    pushService.AssertPush(
      gugu.Id, "jayBee n'a pas accepté votre demande"
    );

    {
      currentContext.SetCurrentUser(gugu);
      var list = await tested.Match();

      Assert.IsInstanceOf<LianeState.Detached>(list.First().State);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var list = await tested.Match();

      Assert.IsInstanceOf<LianeState.Detached>(list.First().State);
    }
  }

  [Test]
  public async Task GuguJoinExistingLianeViaJaybeeDirectly()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(mathilde);
      await tested.JoinRequest(lianeMathilde.Id, lianeJayBee.Id);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var liane = await tested.JoinRequest(lianeMathilde.Id, lianeJayBee.Id);
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(jayBee.Id, mathilde.Id), liane.Members.Select(m => m.User.Id));
    }

    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var liane = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(jayBee.Id, mathilde.Id, gugu.Id), liane.Members.Select(m => m.User.Id));
    }
    
    pushService.AssertPush(
      jayBee.Id, "mathilde souhaite rejoindre votre liane"
    );

    pushService.AssertMessage(jayBee.Id,
      "jayBee a rejoint la liane",
      "mathilde a rejoint la liane",
      "gugu souhaite rejoindre la liane",
      "gugu a rejoint la liane"
    );
    
    pushService.AssertMessage(mathilde.Id,
      "jayBee a rejoint la liane",
      "mathilde a rejoint la liane",
      "gugu souhaite rejoindre la liane",
      "gugu a rejoint la liane"
    );
    
    pushService.AssertMessage(gugu.Id,
      "gugu a rejoint la liane"
    );
  }

  [Test]
  public async Task GuguIsRejectedFromLianeVieJaybee()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(mathilde);
      await tested.JoinRequest(lianeMathilde.Id, lianeJayBee.Id);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var liane = await tested.JoinRequest(lianeMathilde.Id, lianeJayBee.Id);
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(jayBee.Id, mathilde.Id), liane.Members.Select(m => m.User.Id));
    }

    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var rejected = await tested.Reject(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsTrue(rejected);
    }

    pushService.AssertPush(
      jayBee.Id,
      "mathilde souhaite rejoindre votre liane"
    );
    
    pushService.AssertPush(
      gugu.Id, "Vous n'avez pas été accepté dans la liane"
    );

    pushService.AssertMessage(
      jayBee.Id,
      "jayBee a rejoint la liane",
      "mathilde a rejoint la liane",
      "gugu souhaite rejoindre la liane",
      "La demande de gugu pour rejoindre la liane n'a pas été acceptée"
    );
    pushService.AssertMessage(mathilde.Id,
      "jayBee a rejoint la liane",
      "mathilde a rejoint la liane",
      "gugu souhaite rejoindre la liane",
      "La demande de gugu pour rejoindre la liane n'a pas été acceptée"
    );
  }

  [Test]
  public async Task GuguJoinExistingLianeViaMathildeIndirectly()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(mathilde);
      await tested.JoinRequest(lianeMathilde.Id, lianeJayBee.Id);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var liane = await tested.JoinRequest(lianeMathilde.Id, lianeJayBee.Id);
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(jayBee.Id, mathilde.Id), liane.Members.Select(m => m.User.Id));
    }

    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeMathilde.Id, lianeGugu.Id);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var liane = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(jayBee.Id, mathilde.Id, gugu.Id), liane.Members.Select(m => m.User.Id));
    }

    pushService.AssertMessage(jayBee.Id,
      "jayBee a rejoint la liane",
      "mathilde a rejoint la liane",
      "gugu souhaite rejoindre la liane",
      "gugu a rejoint la liane"
    );
    pushService.AssertMessage(mathilde.Id,
      "jayBee a rejoint la liane",
      "mathilde a rejoint la liane",
      "gugu souhaite rejoindre la liane",
      "gugu a rejoint la liane"
    );
    pushService.AssertMessage(gugu.Id,
      "gugu a rejoint la liane"
    );
  }

  [Test]
  public async Task BigLianeCafouillage()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(mathilde);
      await tested.JoinRequest(lianeMathilde.Id, lianeGugu.Id);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
    }

    Api.Community.Liane liane;
    {
      currentContext.SetCurrentUser(gugu);
      liane = (await tested.JoinRequest(lianeMathilde.Id, lianeGugu.Id))!;
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(gugu.Id, mathilde.Id), liane.Members.Select(m => m.User.Id));
    }

    pushService.AssertMessage(
      gugu.Id,
      "gugu a rejoint la liane",
      "mathilde a rejoint la liane",
      "jayBee souhaite rejoindre la liane"
    );

    {
      currentContext.SetCurrentUser(gugu);
      var messages = await messageService.GetMessages(liane.Id, new Pagination(SortAsc: false));
      CollectionAssert.AreEqual(
        ImmutableList.Create(
          (gugu.Id, "jayBee souhaite rejoindre la liane"),
          (gugu.Id, "mathilde a rejoint la liane"),
          (gugu.Id, "gugu a rejoint la liane")
        ), messages.Data.Select(ToTuple)
      );
    }
  }

  [Test]
  public async Task GuguJoinExistingLianeViaMathildeIndirectly2()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, _, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(mathilde);
      await tested.JoinRequest(lianeMathilde.Id, lianeJayBee.Id);
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var liane = await tested.JoinRequest(lianeMathilde.Id, lianeJayBee.Id);
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(jayBee.Id, mathilde.Id), liane.Members.Select(m => m.User.Id));
    }

    {
      currentContext.SetCurrentUser(gugu);
      await tested.JoinRequest(lianeMathilde.Id, lianeGugu.Id);
    }

    {
      currentContext.SetCurrentUser(mathilde);
      var liane = await tested.JoinRequest(lianeMathilde.Id, lianeGugu.Id);
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(jayBee.Id, mathilde.Id, gugu.Id), liane.Members.Select(m => m.User.Id));
    }

    pushService.AssertPush(
      jayBee.Id, "mathilde souhaite rejoindre votre liane"
    );

    pushService.AssertMessage(jayBee.Id,
      "jayBee a rejoint la liane",
      "mathilde a rejoint la liane",
      "gugu souhaite rejoindre la liane",
      "gugu a rejoint la liane"
    );
    pushService.AssertMessage(mathilde.Id,
      "jayBee a rejoint la liane",
      "mathilde a rejoint la liane",
      "gugu souhaite rejoindre la liane",
      "gugu a rejoint la liane"
    );
  }

  [Test]
  public async Task GuguShouldJoinThenLeftJayBeeLianeTheLianeIsEmptied()
  {
    var (lianeGugu, lianeJayBee, lianeMathilde, lianeSiloe, _, _, _, _) = await SetupDefaultLianes();

    {
      currentContext.SetCurrentUser(gugu);
      Assert.IsNull(await tested.JoinRequest(lianeGugu.Id, lianeJayBee.Id));
    }

    Api.Community.Liane? liane;
    {
      currentContext.SetCurrentUser(jayBee);
      liane = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNotNull(liane);
      CollectionAssert.AreEquivalent(ImmutableList.Create(jayBee.Id, gugu.Id), liane!.Members.Select(m => m.User.Id));
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var result = await tested.Leave(liane.Id);
      Assert.IsTrue(result);
    }

    {
      currentContext.SetCurrentUser(gugu);
      var update = await tested.Get(liane.Id);
      Assert.IsNotNull(update);
      CollectionAssert.AreEquivalent(ImmutableList.Create(gugu.Id), update.Members.Select(m => m.User.Id));
    }

    {
      currentContext.SetCurrentUser(jayBee);
      var joined = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNull(joined);
    }

    var ats = pushService.AssertMessage(
      gugu.Id,
      "jayBee a rejoint la liane",
      "gugu a rejoint la liane",
      "jayBee a quitté la liane",
      "jayBee souhaite rejoindre la liane"
    );
    var requestedAt = ats[3];

    {
      currentContext.SetCurrentUser(jayBee);
      var list = await tested.Match();

      AssertMatchesEquals(list,
        new LianeMatch(lianeJayBee, new LianeState.Detached(ImmutableList.Create<Match>(
          new Match.Single(lianeMathilde.Id, ImmutableList.Create(mathilde), "Mathilde", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.FloracFormares,
            LabeledPositions.BalsiegeParkingEglise,
            0.704377413f,
            false, null),
          new Match.Single(lianeSiloe.Id, ImmutableList.Create(siloe), "Siloe", DayOfWeekFlag.All, DefaultTimeRange, LabeledPositions.IspagnacParking, LabeledPositions.Mende, 0.686026692f,
            false, null),
          new Match.Group(liane.Id, ImmutableList.Create(gugu), ImmutableList.Create<Ref<LianeRequest>>(lianeGugu.Id), DayOfWeekFlag.All, DefaultTimeRange,
            LabeledPositions.QuezacParking,
            LabeledPositions.Mende,
            0.651186168f,
            false, requestedAt)
        ))));
    }

    {
      currentContext.SetCurrentUser(gugu);
      var joined = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNotNull(joined);
      Assert.AreEqual(joined!.Id, liane.Id);
    }
  }

  private async Task<LianeRequest> CreateLianeRequest(User user, string name, Ref<RallyingPoint> from, Ref<RallyingPoint> to, Ref<RallyingPoint>? intermediate = null,
    DayOfWeekFlag weekDays = default,
    TimeOnly? arriveBefore = null,
    TimeOnly? returnAfter = null, bool roundTrip = false)
  {
    currentContext.SetCurrentUser(user);
    var wayPoints = intermediate is null ? ImmutableList.Create(from, to) : ImmutableList.Create(from, intermediate, to);
    return await tested.Create(new LianeRequest(null, name, wayPoints, roundTrip,
      arriveBefore ?? DefaultTimeRange.Start,
      returnAfter ?? DefaultTimeRange.End,
      true, weekDays, true, null, null));
  }

  private static void AssertMatchesEquals(ImmutableList<LianeMatch> list, params LianeMatch[] expected)
  {
    list.AssertDeepEqual(expected);
  }

  private static (string User, string Text) ToTuple(LianeMessage message) => (message.CreatedBy.Id, message.Content.Value ?? $"!!{message.Content.GetType().Name}!!");
}