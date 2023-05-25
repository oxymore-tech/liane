using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeStatusServiceTest : BaseIntegrationTest
{
  private LianeServiceImpl lianeService = null!;
  private MockCurrentContext currentContext = null!;
  private EventDispatcher eventDispatcher = null!;
  private LianeStatusUpdate lianeStatusUpdate = null!;

  protected override void Setup(IMongoDatabase db)
  {
    lianeService = ServiceProvider.GetRequiredService<LianeServiceImpl>();
    lianeStatusUpdate = ServiceProvider.GetRequiredService<LianeStatusUpdate>();
    eventDispatcher = ServiceProvider.GetRequiredService<EventDispatcher>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  [Test]
  public async Task ShouldGetNotStartedStatus()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    var departureTime = DateTime.UtcNow.AddMinutes(5);

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende, departureTime);
    await lianeService.AddMember(liane1.Id, new LianeMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende, false));

    await lianeStatusUpdate.Update(DateTime.UtcNow, TimeSpan.FromMinutes(5));

    var actual = await lianeService.Get(liane1.Id);

    Assert.AreEqual(LianeState.NotStarted, actual.State);
    // CollectionAssert.IsEmpty(actual.Carpoolers);
    // Assert.IsNotNull(actual.NextEta);
    // Assert.AreEqual((Ref<RallyingPoint>)liane1.WayPoints[0].RallyingPoint, actual.NextEta!.RallyingPoint);
    // AssertExtensions.AreMongoEquals(departureTime, actual.NextEta.Eta);
  }

  [Test]
  public async Task ShouldGetStartedStatus()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    var departureTime = DateTime.UtcNow.AddMinutes(5);

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende, departureTime);
    await lianeService.AddMember(liane1.Id, new LianeMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende, false));

    currentContext.SetCurrentUser(userA);
    await eventDispatcher.Dispatch(new LianeEvent.MemberPing(liane1.Id, userA.Id, TimeSpan.Zero, null));

    var actual = await lianeService.Get(liane1.Id);

    Assert.AreEqual(LianeState.Started, actual.State);
    // CollectionAssert.AreEquivalent(ImmutableHashSet.Create((Ref<User>)userA.Id), actual.Carpoolers);
    // Assert.IsNotNull(actual.NextEta);
    // Assert.AreEqual((Ref<RallyingPoint>)liane1.WayPoints[0].RallyingPoint, actual.NextEta!.RallyingPoint);
    // AssertExtensions.AreMongoEquals(departureTime, actual.NextEta.Eta);
  }

  [Test]
  public async Task ShouldGetStartedStatusWithDelay()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    var departureTime = DateTime.UtcNow.AddMinutes(5);

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende, departureTime);
    await lianeService.AddMember(liane1.Id, new LianeMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende, false));

    currentContext.SetCurrentUser(userA);
    await eventDispatcher.Dispatch(new LianeEvent.MemberPing(liane1.Id, userA.Id, TimeSpan.FromMinutes(5), null));

    var actual = await lianeService.Get(liane1.Id);

    Assert.AreEqual(LianeState.Started, actual.State);
    // CollectionAssert.AreEquivalent(ImmutableHashSet.Create((Ref<User>)userA.Id), actual.Carpoolers);
    // Assert.IsNotNull(actual.NextEta);
    // Assert.AreEqual((Ref<RallyingPoint>)liane1.WayPoints[0].RallyingPoint, actual.NextEta!.RallyingPoint);
    // AssertExtensions.AreMongoEquals(departureTime, actual.NextEta.Eta);
  }

  private async Task<Api.Trip.Liane> InsertLiane(string id, DbUser userA, Ref<RallyingPoint> from, Ref<RallyingPoint> to, DateTime departureTime)
  {
    currentContext.SetCurrentUser(userA);
    return await lianeService.Create(new LianeRequest(id, departureTime, null, 4, from, to), userA.Id);
  }
}