using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Test.Mock;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class NotificationServiceImplTest : BaseIntegrationTest
{
  private EventDispatcher eventDispatcher = null!;
  private ILianeService lianeService = null!;
  private INotificationService notificationService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    eventDispatcher = ServiceProvider.GetRequiredService<EventDispatcher>();
    lianeService = ServiceProvider.GetRequiredService<ILianeService>();
    notificationService = ServiceProvider.GetRequiredService<INotificationService>();
  }

  [Test]
  public async Task ShouldFindJoinLianeEvent()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    var liane = await lianeService.Create(new LianeRequest(null, DateTime.Now, null, 4, LabeledPositions.BlajouxParking, LabeledPositions.Florac), userA.Id);

    CurrentContext.SetCurrentUser(userB);
    var joinRequest = new LianeEvent.JoinRequest(liane.Id, LabeledPositions.BlajouxParking, LabeledPositions.Florac, 2, false, "Hey !");
    await eventDispatcher.Dispatch(joinRequest);

    var notifications = await notificationService.List(new NotificationFilter(userA.Id, null, liane.Id, new PayloadType.Event<LianeEvent.JoinRequest>()), new Pagination());

    Assert.AreEqual(notifications.Data.Count, 1);

    var notification = notifications.Data[0];
    Assert.AreEqual(userB.Id, notification.Sender!.Id);

    await notificationService.Answer(notification.Id!, Answer.Accept);

    var actual = await lianeService.Get(liane.Id);

    CollectionAssert.AreEquivalent(actual.Members.Select(m => m.User.Id), ImmutableList.Create(userA.Id, userB.Id));
  }

  [Test]
  public async Task ShouldNotSendSameReminderTwice()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    var liane = await lianeService.Create(new LianeRequest(null, DateTime.Now, null, 4, LabeledPositions.BlajouxParking, LabeledPositions.Florac), userA.Id);

    CurrentContext.SetCurrentUser(userB);
    var joinRequest = new LianeEvent.JoinRequest(liane.Id, LabeledPositions.BlajouxParking, LabeledPositions.Florac, 2, false, "Hey !");
    await eventDispatcher.Dispatch(joinRequest);

    var now = DateTime.UtcNow;

    var notification1 = await notificationService.SendReminder("Hello", "Message", ImmutableList.Create<Ref<User>>(userA.Id, userB.Id), new Reminder(liane.Id, LabeledPositions.BlajouxParking, now));
    var notification2 = await notificationService.SendReminder("Hello", "Message", ImmutableList.Create<Ref<User>>(userA.Id, userB.Id), new Reminder(liane.Id, LabeledPositions.QuezacParking, now));
    var notification3 = await notificationService.SendReminder("Hello", "Message", ImmutableList.Create<Ref<User>>(userA.Id, userB.Id), new Reminder(liane.Id, LabeledPositions.BlajouxParking, now));

    
    var mockPushService = ServiceProvider.GetRequiredService<MockPushServiceImpl>();
    var actualA = mockPushService.GetSentNotifications(userA.Id).Where(n => n is Notification.Reminder);
    var actualB = mockPushService.GetSentNotifications(userB.Id).Where(n => n is Notification.Reminder);

    Assert.AreEqual(2, actualA.Count());
    Assert.AreEqual(2, actualB.Count());
  }
}