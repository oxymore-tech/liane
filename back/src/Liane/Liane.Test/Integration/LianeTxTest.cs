using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
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
  private ILianeMessageService messageService = null!;
  private MockCurrentContext currentContext = null!;
  private MockPushServiceImpl pushService = null!;

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
    messageService = ServiceProvider.GetRequiredService<ILianeMessageService>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    pushService = ServiceProvider.GetRequiredService<MockPushServiceImpl>();
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
      var liane = await tested.JoinRequest(lianeJayBee.Id, lianeGugu.Id);
      Assert.IsNull(liane);

      var dateTimes = pushService.Assert(
        (jayBee.Id, $"{gugu.Pseudo} souhaite rejoindre votre liane {lianeJayBee.Name}")
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
  }

  private async Task<LianeRequest> CreateLianeRequest(User user, string name, Ref<RallyingPoint> from, Ref<RallyingPoint> to, Ref<RallyingPoint>? intermediate = null,
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

  private static (string User, string Text) ToTuple(LianeMessage message) => (message.CreatedBy.Id, message.Content.Value ?? $"!!{message.Content.GetType().Name}!!");

  private static void AssertMatchesEquals(ImmutableList<LianeMatch> list, params LianeMatch[] expected)
  {
    list.AssertDeepEqual(expected);
  }
}