using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Driver;

namespace Liane.Service.Internal.Event;

public sealed class NotificationServiceImpl : MongoCrudService<Notification>, INotificationService
{
  private readonly ICurrentContext currentContext;
  private readonly IPushService pushService;
  private readonly EventDispatcher eventDispatcher;

  public NotificationServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext, IPushService pushService, EventDispatcher eventDispatcher) : base(mongo)
  {
    this.currentContext = currentContext;
    this.pushService = pushService;
    this.eventDispatcher = eventDispatcher;
  }

  public Task<Notification> Notify(string title, string message, Ref<Api.User.User> to) => Create(
    new Notification.Info(
      null, currentContext.CurrentUser().Id, DateTime.UtcNow, ImmutableList.Create(new Recipient(to, null)), ImmutableHashSet<Answer>.Empty, title, message)
  );

  public Task<Notification> Notify(string title, string message, Ref<Api.User.User> to, LianeEvent lianeEvent, params Answer[] answers) => Create(
    new Notification.Event(
      null, currentContext.CurrentUser().Id, DateTime.UtcNow, ImmutableList.Create(new Recipient(to, null)), answers.ToImmutableHashSet(), title, message, lianeEvent)
  );

  public new async Task<Notification> Create(Notification obj)
  {
    if (obj.Recipients.IsEmpty)
    {
      throw new ArgumentException("Recipients must not be empty");
    }

    var notification = await base.Create(obj);

    await pushService.SendNotification(notification);

    return notification;
  }

  public async Task<PaginatedResponse<Notification>> List(NotificationFilter notificationFilter, Pagination pagination)
  {
    var filter = Builders<Notification>.Filter.Empty;
    if (notificationFilter.Recipient is not null)
    {
      filter &= Builders<Notification>.Filter.ElemMatch(r => r.Recipients, r => r.User == notificationFilter.Recipient);
    }
    else
    {
      var currentUser = currentContext.CurrentUser();
      filter &= Builders<Notification>.Filter.Eq(r => r.Sender, (Ref<Api.User.User>)currentUser.Id);
    }

    if (notificationFilter.PayloadType is not null)
    {
      filter &= BuildTypeFilter(notificationFilter.PayloadType);
    }

    if (notificationFilter.Liane is not null)
    {
      filter &= Builders<Notification>.Filter.Eq("payload.liane", notificationFilter.Liane);
    }

    return await Mongo.Paginate(pagination, r => r.SentAt, filter, false);
  }

  private static FilterDefinition<Notification> BuildTypeFilter(PayloadType payloadType) => payloadType switch
  {
    PayloadType.Info => Builders<Notification>.Filter.IsInstanceOf<Notification, Notification.Info>(),
    PayloadType.Event lianeEvent => BuildLianeEventTypeFilter(lianeEvent),
    PayloadType.Reminder => Builders<Notification>.Filter.IsInstanceOf<Notification, Notification.Reminder>(),
    _ => throw new ArgumentOutOfRangeException(nameof(payloadType))
  };

  private static FilterDefinition<Notification> BuildLianeEventTypeFilter(PayloadType.Event @event)
  {
    var filter = Builders<Notification>.Filter.IsInstanceOf<Notification, Notification.Event>();
    if (@event.SubType is null)
    {
      return filter;
    }

    return filter & Builders<Notification>.Filter.IsInstanceOf("payload", @event.SubType);
  }

  public async Task Answer(Ref<Notification> id, Answer answer)
  {
    var answerToEvent = await Get(id);
    if (answerToEvent is Notification.Event lianeEvent)
    {
      await eventDispatcher.DispatchAnswer(lianeEvent, answer);
    }

    await Delete(id);
  }

  public async Task MarkAsRead(Ref<Notification> id)
  {
    var e = await Mongo.GetCollection<Notification>()
      .Find(n => n.Id! == id.Id)
      .FirstOrDefaultAsync();

    if (e is null)
    {
      return;
    }

    var userId = currentContext.CurrentUser().Id;


    if (e.Answers.IsEmpty && e.Recipients.Where(r => r.User.Id != userId).All(r => r.SeenAt is not null))
    {
      await Delete(id);
      return;
    }
    
    var memberIndex = e.Recipients.FindIndex(r => r.User.Id == userId);
    await Mongo.GetCollection<Notification>()
      .UpdateOneAsync(n => n.Id! == id.Id,
        Builders<Notification>.Update.Set(n => n.Recipients[memberIndex].SeenAt, DateTime.Now)
      );
  }

  public async Task<int> GetUnreadCount(Ref<Api.User.User> userId)
  {
    var filter = Builders<Notification>.Filter.ElemMatch(n => n.Recipients, r => r.User == userId && r.SeenAt == null);
    var unreadCount = await Mongo.GetCollection<Notification>()
      .Find(filter)
      .Limit(100)
      .CountDocumentsAsync();
    return (int)unreadCount;
  }

  protected override Notification ToDb(Notification inputDto, string originalId)
  {
    return inputDto with { Id = originalId };
  }
}