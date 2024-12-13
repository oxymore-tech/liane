using System;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Trip.Geolocation;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeStatusServiceTest : BaseIntegrationTest
{
  private TripServiceImpl tripService = null!;
  private ILianeTrackerService trackerService = null!;
  private MockCurrentContext currentContext = null!;
  private LianeStatusUpdate lianeStatusUpdate = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tripService = ServiceProvider.GetRequiredService<TripServiceImpl>();
    trackerService = ServiceProvider.GetRequiredService<ILianeTrackerService>();
    lianeStatusUpdate = ServiceProvider.GetRequiredService<LianeStatusUpdate>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  [Test]
  public async Task ShouldUpdateToFinished()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    currentContext.SetAllowPastResourceCreation(true);
    var now = DateTime.UtcNow;
    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddHours(-2));
    var liane2 = await InsertLiane("6408a644437b60cfd3b15872", userB, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddHours(-2));
    var liane3 = await InsertLiane("6408a644437b60cfd3b15875", userB, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddMinutes(-55));
    await tripService.AddMember(liane1, new TripMember(userB.Id, LabeledPositions.Cocures, LabeledPositions.Mende));
    await tripService.AddMember(liane2, new TripMember(userA.Id, LabeledPositions.Cocures, LabeledPositions.Mende));
    await tripService.UpdateState(liane2, TripStatus.Started);
    await lianeStatusUpdate.Update(now);

    liane1 = await tripService.Get(liane1.Id);
    liane2 = await tripService.Get(liane2.Id);
    liane3 = await tripService.Get(liane3.Id);

    Assert.AreEqual(TripStatus.Finished, liane1.State);
    Assert.AreEqual(TripStatus.Finished, liane2.State);
    Assert.AreEqual(TripStatus.Canceled, liane3.State);
  }

  [Test]
  public async Task ShouldGetStartedStatus()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    currentContext.SetAllowPastResourceCreation(true);
    var now = DateTime.UtcNow;

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddMinutes(-2));
    var liane2 = await InsertLiane("6408a644437b60cfd3b15875", userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddHours(-2));
    var liane3 = await InsertLiane("6408a644437b60cfd3b15876", userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddMinutes(10));
    var liane4 = await InsertLiane("6408a644437b60cfd3b15876", userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddMinutes(2));
    await tripService.AddMember(liane1.Id, new TripMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende));
    await tripService.AddMember(liane4.Id, new TripMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende));

    await lianeStatusUpdate.Update(now);
    liane1 = await tripService.Get(liane1.Id);
    liane2 = await tripService.Get(liane2.Id);
    liane3 = await tripService.Get(liane3.Id);
    liane4 = await tripService.Get(liane4.Id);

    // Assert.AreEqual(LianeState.Started, liane1.State);
    Assert.AreEqual(TripStatus.Canceled, liane2.State);
    Assert.AreEqual(TripStatus.NotStarted, liane3.State);
    // Assert.AreEqual(LianeState.Started, liane4.State);
  }

  [Test]
  [Ignore("Not implemented")]
  public async Task ShouldGetStartedStatusWithDelay()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    var departureTime = DateTime.UtcNow.AddMinutes(5);

    var liane1 = await InsertLiane("6408a644437b60cfd3b15874", userA, LabeledPositions.Cocures, LabeledPositions.Mende, departureTime);
    await tripService.AddMember(liane1.Id, new TripMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende));

    currentContext.SetCurrentUser(userA);
    await trackerService.SendPing(new MemberPing(liane1.Id, ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds(), null));

    var actual = await tripService.Get(liane1.Id);

    // Assert.AreEqual(LianeState.Started, actual.State);
    // CollectionAssert.AreEquivalent(ImmutableHashSet.Create((Ref<User>)userA.Id), actual.Carpoolers);
    // Assert.IsNotNull(actual.NextEta);
    // Assert.AreEqual((Ref<RallyingPoint>)liane1.WayPoints[0].RallyingPoint, actual.NextEta!.RallyingPoint);
    // AssertExtensions.AreMongoEquals(departureTime, actual.NextEta.Eta);
  }

  private async Task<Api.Trip.Trip> InsertLiane(string id, DbUser userA, Ref<RallyingPoint> from, Ref<RallyingPoint> to, DateTime departureTime)
  {
    currentContext.SetCurrentUser(userA);
    return await tripService.Create(new TripRequest(id, null!, departureTime, null, 4, from, to), userA.Id);
  }
}