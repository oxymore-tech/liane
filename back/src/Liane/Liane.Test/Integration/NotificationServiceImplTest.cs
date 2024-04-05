using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Event;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class NotificationServiceImplTest : BaseIntegrationTest
{
  private EventDispatcher eventDispatcher = null!;
  private ITripService tripService = null!;
  private INotificationService notificationService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    eventDispatcher = ServiceProvider.GetRequiredService<EventDispatcher>();
    tripService = ServiceProvider.GetRequiredService<ITripService>();
    notificationService = ServiceProvider.GetRequiredService<INotificationService>();
  }

  [Test]
  public async Task ShouldFindJoinLianeEvent()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    var liane = await tripService.Create(new TripRequest(DateTime.UtcNow.AddHours(10), null, 4, LabeledPositions.BlajouxParking, LabeledPositions.Florac), userA.Id);

    CurrentContext.SetCurrentUser(userB);
    var joinRequest = new TripEvent.JoinRequest(liane.Id, LabeledPositions.BlajouxParking, LabeledPositions.Florac, 2, false, "Hey !");
    await eventDispatcher.Dispatch(joinRequest);

    var notifications = await notificationService.List(new NotificationFilter(userA.Id, null, liane.Id, new PayloadType.Event<TripEvent.JoinRequest>()), new Pagination());

    Assert.AreEqual(notifications.Data.Count, 1);

    var notification = notifications.Data[0];
    Assert.AreEqual(userB.Id, notification.CreatedBy!.Id);

    await notificationService.Answer(notification.Id!, Answer.Accept);

    var actual = await tripService.Get(liane.Id);

    CollectionAssert.AreEquivalent(actual.Members.Select(m => m.User.Id), ImmutableList.Create(userA.Id, userB.Id));
  }
}