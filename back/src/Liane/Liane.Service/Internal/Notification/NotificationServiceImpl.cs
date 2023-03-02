using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.Notification;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.User;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Notification;

public sealed class NotificationServiceImpl : BaseMongoCrudService<NotificationDb, BaseNotification>, INotificationService, ISendNotificationService
{
  private readonly IUserService userService;
  private readonly JsonSerializerOptions jsonSerializerOptions;
  private readonly IHubService hubService;
  private readonly ILogger<NotificationServiceImpl> logger;

  public NotificationServiceImpl(
    FirebaseSettings firebaseSettings, 
    IUserService userService,
    ILogger<NotificationServiceImpl> logger, 
    IMongoDatabase database, 
    JsonSerializerOptions jsonSerializerOptions, IHubService hubService) : base(database)
  {
    this.userService = userService;
    this.logger = logger;
    this.jsonSerializerOptions = jsonSerializerOptions;
    this.hubService = hubService;
    if (firebaseSettings.ServiceAccountFile is null)
    {
      logger.LogWarning("Unable to init firebase because service account file is missing");
    }
    else
    {
      FirebaseApp.Create(new AppOptions { Credential = GoogleCredential.FromFile(firebaseSettings.ServiceAccountFile) });
    }
  }

  private async Task<(string title, string message)> WriteNotificationFr(Ref<Api.User.User> receiver, BaseNotification notification)
  {
    if (notification is BaseNotification.Notification<JoinLianeRequest> n)
    {
      if (receiver.Id == n.Event.CreatedBy)
      {
        if (n.Event.Accepted == true) return ("Demande acceptée", "Vous avez rejoint une nouvelle Liane !");
        if (n.Event.Accepted == false) return ("Demande refusée", "Votre demande a été refusée.");
      }
      else
      {
        var role = n.Event.Seats > 0 ? "conducteur" : "passager";
        return ("Nouvelle demande", $"Un nouveau {role} voudrait rejoindre votre Liane.");
      }
    }

    return ("Notification", "NA");
  }
  
  private async Task SendNotificationTo(Ref<Api.User.User> receiver, BaseNotification notification)
  {
    // Try send via hub direct connection
    if (await hubService.TrySendNotification(receiver, notification))
    {
     return;
      
    }
    // Otherwise send via FCM
    try
    {
      var (title, message) = await WriteNotificationFr(receiver, notification);
      await SendTo(receiver, title, message, notification);
    }
    catch (Exception e)
    {
      logger.LogDebug("Tried to send notification to user without pushToken {receiver}", receiver.Id);
    }
  }

  public async Task<string> SendTo(Ref<Api.User.User> receiver, string title, string message, object? payload = null)
  {
    var receiverUser = await ResolveRef<DbUser>(receiver);
    if (receiverUser == null) throw new ArgumentNullException("No user with Id "+receiver.Id);

     
    if (receiverUser.PushToken is null)
    {
      throw new ValidationException("pushToken", ValidationMessage.IsRequired);
    }

    // For now just send the whole notification object in json
    var jsonObject = payload is null ? null : JsonSerializer.Serialize(payload, jsonSerializerOptions);
    return await Send(receiverUser.PushToken, title, message, jsonObject);
  }

  public async Task<string> SendTo(string phone, string title, string message)
  {
    var user = await userService.GetByPhone(phone);
    if (user.PushToken is null)
    {
      throw new ValidationException("pushToken", ValidationMessage.IsRequired);
    }

    return await Send(user.PushToken, title, message);
  }

  public Task<string> Send(string deviceToken, string title, string message, string? jsonPayload = null)
  {
    var firebaseMessage = new Message
    {
      Token = deviceToken,
      
      Notification = new FirebaseAdmin.Messaging.Notification
      {
        Title = title,
        Body = message
      }
    };
    if (jsonPayload is not null) firebaseMessage.Data = new Dictionary<string, string> { { "jsonPayload", jsonPayload } };
    return FirebaseMessaging.DefaultInstance.SendAsync(firebaseMessage);
  }

  private static BaseNotification MapEntityClass<T>(NotificationDb.WithEvent<T> dbRecord) where T : class
  {
    return new BaseNotification.Notification<T>(dbRecord.Id, dbRecord.CreatedAt, dbRecord.Event);
  }

  protected override async Task<BaseNotification> MapEntity(NotificationDb dbRecord)
  {
    var type = dbRecord.GetType();
    if (!type.IsGenericType || type.GetGenericTypeDefinition() !=(typeof(NotificationDb.WithEvent<>)))
    {
      throw new ArgumentException("Bad NotificationDb type : " + nameof(type));
    }
    var eventType = type.GetGenericArguments()[0];
    var method = typeof(NotificationServiceImpl).GetMethod(nameof(MapEntityClass), BindingFlags.Static | BindingFlags.NonPublic)!;
    var generic = method.MakeGenericMethod(eventType);
    return (BaseNotification)generic.Invoke(this, new object?[]{dbRecord})!;
  }

  public async Task Create<T>(T linkedEvent, Ref<Api.User.User> receiver) where T : class
  {
    await Create(linkedEvent, new[] { receiver }.ToImmutableList());
  }
  public async Task Create<T>(T linkedEvent, ImmutableList<Ref<Api.User.User>> receivers) where T : class
  {
    var timestamp = DateTime.Now;
    var dbRecord = new NotificationDb.WithEvent<T>(ObjectId.GenerateNewId().ToString(),  linkedEvent, receivers.Select(u => new Receiver(u)).ToImmutableList(), timestamp);
    await Mongo.GetCollection<NotificationDb>().InsertOneAsync(dbRecord);
    // Send notification 
    var notification = new BaseNotification.Notification<T>(dbRecord.Id, timestamp, linkedEvent);
    var _ = Task.Run(() =>
    {
      Parallel.ForEach(receivers, async receiver => await SendNotificationTo(receiver, notification));
    });
  }

  public async Task<int> GetUnreadCount(Ref<Api.User.User> user)
  {
    var filter = Builders<NotificationDb>.Filter.ElemMatch(n => n.Receivers, r => r.User == user.Id && r.SeenAt == null);
    var unreadCount = await Mongo.GetCollection<NotificationDb>()
      .Find(filter)
      .CountDocumentsAsync();
    return (int)Math.Min(100, unreadCount);
  }

  public async Task<PaginatedResponse<BaseNotification>> List(Ref<Api.User.User> user, Pagination pagination)
  {
    var filter = Builders<NotificationDb>.Filter.ElemMatch(r => r.Receivers, r => r.User == user);

    var paginated = await Mongo.Paginate(pagination, r => r.CreatedAt, filter, false);
    var t = await paginated.SelectAsync(async n => (await MapEntity(n)) with {Seen = n.Receivers.Find(r => r.User.Id == user.Id)?.SeenAt is not null});
    return t;
  }
  
  public async Task ReadNotification(string notificationId, Ref<Api.User.User> user)
  {
    //TODO improve
    var notification = await Mongo.GetCollection<NotificationDb>().Find(n => n.Id == notificationId).FirstOrDefaultAsync();
    var memberIndex = notification.Receivers.FindIndex(r => r.User.Id == user.Id);
    await Mongo.GetCollection<NotificationDb>().UpdateOneAsync(n => n.Id == notificationId, 
      Builders<NotificationDb>.Update.Set(n => n.Receivers[memberIndex].SeenAt, DateTime.Now)
      );
  }
}