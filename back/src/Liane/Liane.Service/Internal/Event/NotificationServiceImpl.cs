using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Caching.Memory;
using MongoDB.Driver;

namespace Liane.Service.Internal.Event;

public sealed class NotificationServiceImpl : MongoCrudService<Notification>, INotificationService
{
  private readonly ICurrentContext currentContext;
  private readonly IPushService pushService;
  private readonly EventDispatcher eventDispatcher;
  private readonly MemoryCache memoryCache;

  public NotificationServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext, IPushService pushService, EventDispatcher eventDispatcher) : base(mongo)
  {
    this.currentContext = currentContext;
    this.pushService = pushService;
    this.eventDispatcher = eventDispatcher;
    this.memoryCache = new MemoryCache(new MemoryCacheOptions());
  }

  public Task<Notification> SendInfo(string title, string message, Ref<Api.User.User> to) => Create(
    new Notification.Info(
      null, currentContext.CurrentUser().Id, DateTime.UtcNow, ImmutableList.Create(new Recipient(to, null)), ImmutableHashSet<Answer>.Empty, title, message)
  );

  public Task<Notification> SendEvent(string title, string message, Ref<Api.User.User> createdBy, Ref<Api.User.User> to, LianeEvent lianeEvent, params Answer[] answers) => Create(
    new Notification.Event(
      null, createdBy, DateTime.UtcNow, ImmutableList.Create(new Recipient(to, null)), answers.ToImmutableHashSet(), title, message, lianeEvent)
  );

  public Task<Notification> SendReminder(string title, string message, ImmutableList<Ref<Api.User.User>> to, Reminder reminder)
  {
    if (memoryCache.TryGetValue(reminder, out var n))
    {
      return Task.FromResult((n as Notification)!);
    }

    var notification = new Notification.Reminder(
      null, null, DateTime.UtcNow,
      to.Select(t => new Recipient(t, null)).ToImmutableList(),
      ImmutableHashSet<Answer>.Empty,
      title,
      message,
      reminder);
   memoryCache.Set(reminder, notification, TimeSpan.FromMinutes(10));
   /*  await Task.WhenAll(notification.Recipients.Select(r => pushService.SendNotification(r.User, notification)));*/
    return Task.FromResult<Notification>(notification);
  }

  public async Task SendReminders(DateTime now, IEnumerable<Notification.Reminder> reminders)
  {
    await Task.WhenAll(reminders.Select(notification =>
    {
      if (memoryCache.TryGetValue(notification.Payload, out var n))
      {
        return Task.CompletedTask;
      }

      memoryCache.Set(notification.Payload, notification, TimeSpan.FromMinutes(10));
     // return Task.WhenAll(notification.Recipients.Select(r => pushService.SendNotification(r.User, notification)));
     return Task.CompletedTask;
    }));
    
  }

  public new async Task<Notification> Create(Notification obj)
  {
    if (obj.Recipients.IsEmpty)
    {
      throw new ArgumentException("At least one recipient must be specified");
    }

    var (created, notify) = (await base.Create(obj), true);
    if (notify)
    {
      await Task.WhenAll(obj.Recipients.Select(r => pushService.SendNotification(r.User, created)));
    }

    return created;
  }

  public async Task<PaginatedResponse<Notification>> List(NotificationFilter notificationFilter, Pagination pagination)
  {
    var filter = Builders<Notification>.Filter.Empty;
    if (notificationFilter.Recipient is not null)
    {
      filter &= 
        // Filter unseen notifications or those just seen today
        Builders<Notification>.Filter.ElemMatch(r => r.Recipients, r => r.User == notificationFilter.Recipient && (r.SeenAt == null || r.SeenAt > DateTime.UtcNow.Date))
        | (
          Builders<Notification>.Filter.ElemMatch(r => r.Recipients, r => r.User == notificationFilter.Recipient && r.Answer == null)
          & Builders<Notification>.Filter.SizeGt(r => r.Answers, 0)
        );
    }
    if (notificationFilter.Sender is not null)
    {
      filter &= Builders<Notification>.Filter.Eq(r => r.CreatedBy, notificationFilter.Sender);
    }

    if (notificationFilter.PayloadType is not null)
    {
      filter &= BuildTypeFilter(notificationFilter.PayloadType);
    }

    if (notificationFilter.Liane is not null)
    {
      filter &= Builders<Notification>.Filter.Eq("payload.liane", notificationFilter.Liane);
    }

    return await Mongo.Paginate<Notification, Cursor.Time>(pagination, r => r.CreatedAt, filter, false);
  }

  public Task CleanJoinLianeRequests(IEnumerable<Ref<Api.Trip.Liane>> lianes)
  {
    var filter = Builders<Notification.Event>.Filter.IsInstanceOf<Notification.Event, JoinLianeRequest>(n => n.Payload)
                 & Builders<Notification.Event>.Filter.Where(n => lianes.Contains(n.Payload.Liane));
    return Mongo.GetCollection<Notification.Event>()
      .DeleteManyAsync(filter);
  }

  public Task CleanNotifications(IEnumerable<Ref<Api.Trip.Liane>> lianes)
  {
    return Mongo.GetCollection<Notification>()
      .DeleteManyAsync(Builders<Notification>.Filter.In("Payload.Liane", lianes));
  }

  private static FilterDefinition<Notification> BuildTypeFilter(PayloadType payloadType) => payloadType switch
  {
    PayloadType.Info => Builders<Notification>.Filter.IsInstanceOf<Notification, Notification.Info>(),
    PayloadType.Event lianeEvent => BuildLianeEventTypeFilter(lianeEvent),
    PayloadType.Reminder => Builders<Notification>.Filter.IsInstanceOf<Notification, Notification.Reminder>(),
    _ => throw new ArgumentOutOfRangeException(nameof(payloadType))
  };

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
    var e = await Get(id);

    var userId = currentContext.CurrentUser().Id;

    var memberIndex = e.Recipients.FindIndex(r => r.User.Id == userId);
    await Mongo.GetCollection<Notification>()
      .UpdateOneAsync(n => n.Id! == id.Id,
        Builders<Notification>.Update.Set(n => n.Recipients[memberIndex].SeenAt, DateTime.UtcNow)
      );
  }

  public async Task MarkAsRead(IEnumerable<Ref<Notification>> ids)
  {
    await Parallel.ForEachAsync(ids, async (@ref, _) => await MarkAsRead(@ref));
  }
  public async Task<ImmutableList<Ref<Notification>>> GetUnread(Ref<Api.User.User> userId)
  {
    var filter = Builders<Notification>.Filter.ElemMatch(n => n.Recipients, r => r.User == userId && r.SeenAt == null);
    var unread = await Mongo.GetCollection<Notification>()
      .Find(filter)
      .Limit(100)
      .ToListAsync();
    return unread.Select(n => (Ref<Notification>)n.Id!).ToImmutableList();
  }

  private static FilterDefinition<Notification> BuildLianeEventTypeFilter(PayloadType.Event @event)
  {
    var filter = Builders<Notification>.Filter.IsInstanceOf<Notification, Notification.Event>();
    if (@event.SubType is null)
    {
      return filter;
    }

    return filter & Builders<Notification>.Filter.IsInstanceOf("payload", @event.SubType);
  }

  protected override Notification ToDb(Notification inputDto, string originalId)
  {
    return inputDto with { Id = originalId };
  }
}