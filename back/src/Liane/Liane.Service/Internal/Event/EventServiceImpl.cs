using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

namespace Liane.Service.Internal.Event;

public sealed class EventServiceImpl : MongoCrudService<Api.Event.Event>, IEventService
{
  private readonly ICurrentContext currentContext;
  private readonly IServiceProvider serviceProvider;

  public EventServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext, IServiceProvider serviceProvider) : base(mongo)
  {
    this.currentContext = currentContext;
    this.serviceProvider = serviceProvider;
  }

  public new Task<Api.Event.Event> Create(Api.Event.Event obj) => InternalCreate(obj, null);

  private async Task<Api.Event.Event> InternalCreate(Api.Event.Event obj, Api.Event.Event? answersToEvent)
  {
    if (obj.Recipients.IsEmpty)
    {
      await Dispatch(obj, answersToEvent);
      return obj;
    }

    var created = await base.Create(obj);
    await Dispatch(created, answersToEvent);
    return created;
  }

  private async Task Dispatch(Api.Event.Event created, Api.Event.Event? answersToEvent)
  {
    var listeners = serviceProvider.GetServices<IEventListener>();
    foreach (var eventListener in listeners)
    {
      await eventListener.OnEvent(created, answersToEvent);
    }
  }

  public async Task<Api.Event.Event> Create(LianeEvent lianeEvent)
  {
    var currentUser = currentContext.CurrentUser();
    var lianeService = serviceProvider.GetService<ILianeService>();
    var resolved = await lianeEvent.Liane.Resolve(lianeService!.Get);
    var needsAnswer = NeedsAnswer(lianeEvent);
    return await InternalCreate(new Api.Event.Event(null, ImmutableList.Create(new Recipient(resolved.Driver.User, null)), currentUser.Id, DateTime.UtcNow, needsAnswer, lianeEvent), null);
  }

  public async Task<Api.Event.Event> Answer(Ref<Api.Event.Event> id, LianeEvent lianeEvent)
  {
    var currentUser = currentContext.CurrentUser();
    var answerToEvent = await Get(id);
    await Delete(id);
    return await InternalCreate(new Api.Event.Event(null, ImmutableList.Create(new Recipient(answerToEvent.CreatedBy, null)), currentUser.Id, DateTime.UtcNow, false, lianeEvent), answerToEvent);
  }

  public async Task<PaginatedResponse<Api.Event.Event>> List(EventFilter eventFilter, Pagination pagination)
  {
    var filter = Builders<Api.Event.Event>.Filter.Empty;
    var currentUser = currentContext.CurrentUser();
    if (eventFilter.AsRecipient)
    {
      filter &= Builders<Api.Event.Event>.Filter.ElemMatch(r => r.Recipients, r => r.User == currentUser.Id);
    }
    else
    {
      filter &= Builders<Api.Event.Event>.Filter.Eq(r => r.CreatedBy, (Ref<Api.User.User>)currentUser.Id);
    }

    if (eventFilter.Liane is not null)
    {
      filter &= Builders<Api.Event.Event>.Filter.Eq(e => e.LianeEvent.Liane, eventFilter.Liane);
    }

    if (eventFilter.Type is not null)
    {
      filter &= Builders<Api.Event.Event>.Filter.IsInstanceOf(e => e.LianeEvent, eventFilter.Type);
    }

    return await Mongo.Paginate(pagination, r => r.CreatedAt, filter, false);
  }

  private static bool NeedsAnswer(LianeEvent lianeEvent) =>
    lianeEvent switch
    {
      LianeEvent.JoinRequest => true,
      _ => false
    };

  public async Task<PaginatedResponse<Api.Event.Event>> List(Pagination pagination)
  {
    var user = currentContext.CurrentUser();
    var filter = Builders<Api.Event.Event>.Filter.ElemMatch(r => r.Recipients, r => r.User == user.Id);
    return await Mongo.Paginate(pagination, r => r.CreatedAt, filter, false);
  }

  public async Task<int> GetUnreadCount(Ref<Api.User.User> user)
  {
    var filter = Builders<Api.Event.Event>.Filter.ElemMatch(n => n.Recipients, r => r.User == user.Id && r.SeenAt == null);
    var unreadCount = await Mongo.GetCollection<Api.Event.Event>()
      .Find(filter)
      .CountDocumentsAsync();
    return (int)Math.Min(100, unreadCount);
  }

  public async Task MarkAsRead(Ref<Api.Event.Event> id)
  {
    var e = await Mongo.GetCollection<Api.Event.Event>()
      .Find(n => n.Id! == id.Id)
      .FirstOrDefaultAsync();

    if (e is null)
    {
      return;
    }

    var userId = currentContext.CurrentUser().Id;

    if (!e.NeedsAnswer && e.Recipients.Where(r => r.User.Id != userId).All(r => r.SeenAt is not null))
    {
      await Delete(id);
      return;
    }

    var memberIndex = e.Recipients.FindIndex(r => r.User.Id == userId);
    await Mongo.GetCollection<Api.Event.Event>()
      .UpdateOneAsync(n => n.Id! == id.Id,
        Builders<Api.Event.Event>.Update.Set(n => n.Recipients[memberIndex].SeenAt, DateTime.Now)
      );
  }

  protected override Api.Event.Event ToDb(Api.Event.Event inputDto, string originalId)
  {
    return inputDto with { Id = originalId };
  }
}