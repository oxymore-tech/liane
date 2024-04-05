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
public sealed class TripStatusServiceTest : BaseIntegrationTest
{
  private TripServiceImpl tripService = null!;
  private MockCurrentContext currentContext = null!;
  private EventDispatcher eventDispatcher = null!;
  private TripStatusUpdate tripStatusUpdate = null!;

  protected override void Setup(IMongoDatabase db)
  {
    tripService = ServiceProvider.GetRequiredService<TripServiceImpl>();
    tripStatusUpdate = ServiceProvider.GetRequiredService<TripStatusUpdate>();
    eventDispatcher = ServiceProvider.GetRequiredService<EventDispatcher>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
  }

  [Test]
  public async Task ShouldUpdateToFinished()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    currentContext.SetAllowPastResourceCreation(true);
    var now = DateTime.UtcNow;
    var trip1 = await InsertTrip(userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddHours(-2));
    var trip2 = await InsertTrip(userB, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddHours(-2));
    var trip3 = await InsertTrip(userB, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddMinutes(-55));
    await tripService.AddMember(trip1, new TripMember(userB.Id, LabeledPositions.Cocures, LabeledPositions.Mende));
    await tripService.AddMember(trip2, new TripMember(userA.Id, LabeledPositions.Cocures, LabeledPositions.Mende));
    await tripService.UpdateState(trip2, TripState.Started);
    await tripStatusUpdate.Update(now);

    trip1 = await tripService.Get(trip1.Id);
    trip2 = await tripService.Get(trip2.Id);
    trip3 = await tripService.Get(trip3.Id);

    Assert.AreEqual(TripState.Finished, trip1.State);
    Assert.AreEqual(TripState.Finished, trip2.State);
    Assert.AreEqual(TripState.Canceled, trip3.State);
  }

  [Test]
  public async Task ShouldGetStartedStatus()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    currentContext.SetAllowPastResourceCreation(true);
    var now = DateTime.UtcNow;

    var trip1 = await InsertTrip(userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddMinutes(-2));
    var trip2 = await InsertTrip(userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddHours(-2));
    var trip3 = await InsertTrip(userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddMinutes(10));
    var trip4 = await InsertTrip(userA, LabeledPositions.Cocures, LabeledPositions.Mende, now.AddMinutes(2));
    await tripService.AddMember(trip1.Id, new TripMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende));
    await tripService.AddMember(trip4.Id, new TripMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende));

    await tripStatusUpdate.Update(now);
    trip1 = await tripService.Get(trip1.Id);
    trip2 = await tripService.Get(trip2.Id);
    trip3 = await tripService.Get(trip3.Id);
    trip4 = await tripService.Get(trip4.Id);

    // Assert.AreEqual(TripState.Started, trip1.State);
    Assert.AreEqual(TripState.Canceled, trip2.State);
    Assert.AreEqual(TripState.NotStarted, trip3.State);
    // Assert.AreEqual(TripState.Started, trip4.State);
  }

  [Test]
  [Ignore("Not implemented")]
  public async Task ShouldGetStartedStatusWithDelay()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];

    var departureTime = DateTime.UtcNow.AddMinutes(5);

    var trip1 = await InsertTrip(userA, LabeledPositions.Cocures, LabeledPositions.Mende, departureTime);
    await tripService.AddMember(trip1.Id, new TripMember(userB.Id, LabeledPositions.QuezacParking, LabeledPositions.Mende));

    currentContext.SetCurrentUser(userA);
    await eventDispatcher.Dispatch(new TripEvent.MemberPing(trip1.Id, ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds(), TimeSpan.FromMinutes(5), null));

    var actual = await tripService.Get(trip1.Id);

    // Assert.AreEqual(TripState.Started, actual.State);
    // CollectionAssert.AreEquivalent(ImmutableHashSet.Create((Ref<User>)userA.Id), actual.Carpoolers);
    // Assert.IsNotNull(actual.NextEta);
    // Assert.AreEqual((Ref<RallyingPoint>)trip1.WayPoints[0].RallyingPoint, actual.NextEta!.RallyingPoint);
    // AssertExtensions.AreMongoEquals(departureTime, actual.NextEta.Eta);
  }

  private async Task<Api.Trip.Trip> InsertTrip(DbUser userA, Ref<RallyingPoint> from, Ref<RallyingPoint> to, DateTime departureTime)
  {
    currentContext.SetCurrentUser(userA);
    return await tripService.Create(new TripRequest(departureTime, null, 4, from, to), userA.Id);
  }
}