using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Trip.Event;
using Liane.Service.Internal.User;
using Liane.Web.Internal.Startup;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeStatusServiceTest : BaseIntegrationTest
{
  private LianeServiceImpl lianeService = null!;
  private ILianeStatusService lianeStatusService = null!;
  private MockCurrentContext currentContext = null!;
  private EventDispatcher eventDispatcher = null!;

  protected override void Setup(IMongoDatabase db)
  {
    lianeService = ServiceProvider.GetRequiredService<LianeServiceImpl>();
    lianeStatusService = ServiceProvider.GetRequiredService<ILianeStatusService>();
    eventDispatcher = ServiceProvider.GetRequiredService<EventDispatcher>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  [Test]
  public async Task ShouldGetStatus()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende);

    currentContext.SetCurrentUser(userA);
    await eventDispatcher.Dispatch(new LianeEvent.MemberAccepted(liane1.Id, userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende, -1, false));

    currentContext.SetCurrentUser(userB);
    await eventDispatcher.Dispatch(new LianeEvent.MemberPing(liane1.Id, userB.Id, TimeSpan.Zero, null));

    var actual = await lianeStatusService.GetStatus(liane1.Id);

    Assert.AreEqual(LianeState.Started, actual.State);
    // Assert.AreEqual((Ref<User>)userB.Id, actual.Pings[0].User);
    // AssertExtensions.AreMongoEquals(e2.CreatedAt!.Value, actual.Pings[0].At);
    // Assert.AreEqual(TimeSpan.Zero, actual.Pings[0].Delay);
    // Assert.AreEqual(null, actual.Pings[0].Coordinate);
  }

  private async Task<Api.Trip.Liane> InsertLiane(string id, DbUser userA, Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    var departureTime = DateTime.UtcNow.AddHours(9);
    currentContext.SetCurrentUser(userA);
    return await lianeService.Create(new LianeRequest(id, departureTime, null, 4, from, to), userA.Id);
  }
}