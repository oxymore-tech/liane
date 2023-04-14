using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Trip.Event;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeEventTest : BaseIntegrationTest
{
  private LianeServiceImpl lianeService = null!;
  private MockCurrentContext currentContext = null!;
  private EventServiceImpl eventService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    lianeService = ServiceProvider.GetRequiredService<LianeServiceImpl>();
    eventService = ServiceProvider.GetRequiredService<EventServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  protected override void SetupServices(IServiceCollection services)
  {
    services.AddService(Moq.Mock.Of<IHubService>());
    services.AddService<UserServiceImpl>();
    services.AddService<ChatServiceImpl>();
    services.AddService<LianeServiceImpl>();
    services.AddService<PushServiceImpl>();
    services.AddService<LianeMemberAcceptedHandler>();
    services.AddService<LianeMemberPingHandler>();
  }

  [Test]
  public async Task ShouldDisplayLiane()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende);

    currentContext.SetCurrentUser(userA);
    var e1 = await eventService.Create(new LianeEvent.MemberAccepted(liane1.Id, userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende, -1, false));

    currentContext.SetCurrentUser(userB);
    var e2 = await eventService.Create(new LianeEvent.MemberPing(liane1.Id, TimeSpan.Zero, null));

    var actual = await lianeService.GetStatus(liane1.Id);

    Assert.AreEqual(LianeState.Started, actual.State);
    Assert.AreEqual((Ref<User>)userB.Id, actual.Pings[0].User);
    Assert.IsTrue(e2.CreatedAt!.Value.MongoEquals(actual.Pings[0].At));
    Assert.AreEqual(TimeSpan.Zero, actual.Pings[0].Delay);
    Assert.AreEqual(null, actual.Pings[0].Coordinate);
  }

  private async Task<Api.Trip.Liane> InsertLiane(string id, DbUser userA, Ref<RallyingPoint> from, Ref<RallyingPoint> to)
  {
    var departureTime = DateTime.UtcNow.AddHours(9);
    currentContext.SetCurrentUser(userA);
    return await lianeService.Create(new LianeRequest(id, departureTime, null, 4, from, to), userA.Id);
  }
}

public static class MongoDateComparison
{
  private const int precisionInMilliseconds = 1000;

  public static bool MongoEquals(this DateTime dateTime, DateTime mongoDateTime)
  {
    return Math.Abs((dateTime - mongoDateTime).TotalMilliseconds) < precisionInMilliseconds;
  }
}