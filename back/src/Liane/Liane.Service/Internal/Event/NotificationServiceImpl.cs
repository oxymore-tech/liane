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

  public Task<Notification> SendInfo(string title, string message, Ref<Api.User.User> to) => Create(
    new Notification.Info(
      null, currentContext.CurrentUser().Id, DateTime.UtcNow, ImmutableList.Create(new Recipient(to, null)), ImmutableHashSet<Answer>.Empty, title, message)
  );

  public Task<Notification> SendEvent(string title, string message, Ref<Api.User.User> to, LianeEvent lianeEvent, params Answer[] answers) => Create(
    new Notification.Event(
      null, currentContext.CurrentUser().Id, DateTime.UtcNow, ImmutableList.Create(new Recipient(to, null)), answers.ToImmutableHashSet(), title, message, lianeEvent)
  );

  public Task<Notification> SendReminder(string title, string message, ImmutableList<Ref<Api.User.User>> to, Reminder reminder) => Create(
    new Notification.Reminder(
      null, null, DateTime.UtcNow, to.Select(t => new Recipient(t, null)).ToImmutableList(), ImmutableHashSet<Answer>.Empty, title, message, reminder)
  );

  public async Task SendReminders(DateTime now, IEnumerable<Notification.Reminder> reminders)
  {
    var existing = await Mongo.GetCollection<Notification.Reminder>()
      .Find(Builders<Notification.Reminder>.Filter.IsInstanceOf<Notification.Reminder, Notification.Reminder>())
      .ToListAsync();

    var payloads = existing.Select(r => r.Payload)
      .ToImmutableHashSet();

    var bulks = existing.Where(r => r.Payload.At >= now)
      .Select(reminder => new DeleteOneModel<Notification.Reminder>(Builders<Notification.Reminder>.Filter.Eq(r => r.Id, reminder.Id)))
      .Cast<WriteModel<Notification.Reminder>>()
      .Concat(reminders.Where(r => payloads.Contains(r.Payload))
        .Select(r => new InsertOneModel<Notification.Reminder>(r)))
      .ToImmutableList();

    if (bulks.IsEmpty)
    {
      return;
    }

    var result = await Mongo.GetCollection<Notification.Reminder>()
      .BulkWriteAsync(bulks);

    foreach (var reminder in result.Upserts.Select(u => ((InsertOneModel<Notification.Reminder>)bulks[u.Index]).Document with { Id = u.Id.AsString }))
    {
      if (reminder.Recipients.IsEmpty)
      {
        continue;
      }

      await Task.WhenAll(reminder.Recipients.Select(r => pushService.SendNotification(r.User, reminder)));
    }
  }

  public new async Task<Notification> Create(Notification obj)
  {
    if (obj.Recipients.IsEmpty)
    {
      throw new ArgumentException("At least one recipient must be specified");
    }

    var (created, notify) = obj switch
    {
      Notification.Reminder reminder => await CreateReminder(reminder),
      _ => (await base.Create(obj), true)
    };

    if (notify)
    {
      await Task.WhenAll(obj.Recipients.Select(r => pushService.SendNotification(r.User, created)));
    }

    return created;
  }

  private async Task<(Notification, bool)> CreateReminder(Notification.Reminder reminder)
  {
    var existing = await Mongo.GetCollection<Notification.Reminder>()
      .Find(Builders<Notification.Reminder>.Filter.IsInstanceOf<Notification.Reminder, Notification.Reminder>() & Builders<Notification.Reminder>.Filter.Where(n => n.Payload == reminder.Payload))
      .FirstOrDefaultAsync();

    return existing is not null
      ? (existing, false)
      : (await base.Create(reminder), true);
  }

  public async Task<PaginatedResponse<Notification>> List(NotificationFilter notificationFilter, Pagination pagination)
  {
    var filter = Builders<Notification>.Filter.Empty;
    if (notificationFilter.Recipient is not null)
    {
      filter &= Builders<Notification>.Filter.ElemMatch(r => r.Recipients, r => r.User == notificationFilter.Recipient);
    }

    if (notificationFilter.Sender is not null)
    {
      filter &= Builders<Notification>.Filter.Eq(r => r.Sender, notificationFilter.Sender);
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

  public Task CleanJoinLianeRequests(ImmutableList<Ref<Api.Trip.Liane>> lianes)
  {
    var filter = Builders<Notification.Event>.Filter.IsInstanceOf<Notification.Event, JoinLianeRequest>(n => n.Payload)
                 & Builders<Notification.Event>.Filter.Where(n => lianes.Contains(n.Payload.Liane));
    return Mongo.GetCollection<Notification.Event>()
      .DeleteManyAsync(filter);
  }

  public Task CleanNotifications(ImmutableList<Ref<Api.Trip.Liane>> lianes)
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