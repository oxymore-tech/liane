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

public sealed class NotificationServiceImpl : BaseMongoCrudService<NotificationDb, NotificationPayload>, INotificationService, ISendNotificationService
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

  private async Task SendNotificationTo(Ref<Api.User.User> receiver, NotificationPayload notification)
  {
    var (title, message) = WriteNotificationFr(receiver, notification);

    if (await hubService.TrySendNotification(receiver, new Api.Notification.Notification(title, message, notification)))
    {
      return;
    }

    try
    {
      await SendTo(receiver, title, message, notification);
    }
    catch (Exception e)
    {
      logger.LogWarning(e, "Unable to send notification to user {receiver}", receiver.Id);
    }
  }

  public async Task<string> SendTo(Ref<Api.User.User> receiver, string title, string message, object? payload = null)
  {
    var receiverUser = await ResolveRef<DbUser>(receiver);
    if (receiverUser == null)
    {
      throw new ArgumentNullException("No user with Id " + receiver.Id);
    }

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

  private static NotificationPayload MapEntityClass<T>(NotificationDb.WithEvent<T> dbRecord) where T : IEntity
  {
    return new NotificationPayload.WithEvent<T>(dbRecord.Id, dbRecord.CreatedAt, dbRecord.Event);
  }

  protected override Task<NotificationPayload> MapEntity(NotificationDb dbRecord)
  {
    var type = dbRecord.GetType();
    if (!type.IsGenericType || type.GetGenericTypeDefinition() != (typeof(NotificationDb.WithEvent<>)))
    {
      throw new ArgumentException("Bad NotificationDb type : " + nameof(type));
    }

    var eventType = type.GetGenericArguments()[0];
    var method = typeof(NotificationServiceImpl).GetMethod(nameof(MapEntityClass), BindingFlags.Static | BindingFlags.NonPublic)!;
    var generic = method.MakeGenericMethod(eventType);
    return Task.FromResult((NotificationPayload)generic.Invoke(this, new object?[] { dbRecord })!);
  }

  public async Task Create<T>(T linkedEvent, Ref<Api.User.User> receiver) where T : IEntity
  {
    await Create(linkedEvent, new[] { receiver }.ToImmutableList());
  }

  public async Task Create<T>(T linkedEvent, ImmutableList<Ref<Api.User.User>> receivers) where T : IEntity
  {
    var timestamp = DateTime.Now;
    var dbRecord = new NotificationDb.WithEvent<T>(
      ObjectId.GenerateNewId().ToString(),
      linkedEvent,
      true,
      receivers.Select(u => new Receiver(u)).ToImmutableList(),
      timestamp
    );
    await Mongo.GetCollection<NotificationDb>()
      .InsertOneAsync(dbRecord);

    var notification = new NotificationPayload.WithEvent<T>(dbRecord.Id, timestamp, linkedEvent);
    foreach (var receiver in receivers)
    {
      var _ = Task.Run(() => SendNotificationTo(receiver, notification));
    }
  }

  public Task Delete(string id)
  {
    return Mongo.GetCollection<NotificationDb>()
      .DeleteOneAsync(n => n.Id == id);
  }

  public async Task<int> GetUnreadCount(Ref<Api.User.User> user)
  {
    var filter = Builders<NotificationDb>.Filter.ElemMatch(n => n.Receivers, r => r.User == user.Id && r.SeenAt == null);
    var unreadCount = await Mongo.GetCollection<NotificationDb>()
      .Find(filter)
      .CountDocumentsAsync();
    return (int)Math.Min(100, unreadCount);
  }

  private static (string title, string message) WriteNotificationFr(Ref<Api.User.User> receiver, NotificationPayload notification)
  {
    if (notification is not NotificationPayload.WithEvent<JoinLianeRequest> j)
    {
      return ("Notification", "NA");
    }

    if (receiver.Id == j.Event.CreatedBy)
    {
      return j.Event.Accepted switch
      {
        false or null => ("Demande refusée", "Votre demande a été refusée."),
        true => ("Demande acceptée", "Vous avez rejoint une nouvelle Liane !")
      };
    }

    var role = j.Event.Seats > 0 ? "conducteur" : "passager";
    return ("Nouvelle demande", $"Un nouveau {role} voudrait rejoindre votre Liane.");
  }

  private async Task<Api.Notification.Notification> MapNotification(Ref<Api.User.User> user, NotificationDb n)
  {
    var payload = await MapEntity(n) with { Seen = n.Receivers.Find(r => r.User.Id == user.Id)?.SeenAt is not null };
    var (title, message) = WriteNotificationFr(user, payload);
    return new Api.Notification.Notification(title, message, payload);
  }

  public async Task<PaginatedResponse<Api.Notification.Notification>> List(Ref<Api.User.User> user, Pagination pagination)
  {
    var filter = Builders<NotificationDb>.Filter.ElemMatch(r => r.Receivers, r => r.User == user);

    var paginated = await Mongo.Paginate(pagination, r => r.CreatedAt, filter, false);
    return await paginated.SelectAsync(n => MapNotification(user, n));
  }

  public async Task MarkAsRead(string notificationId, Ref<Api.User.User> user)
  {
    //TODO improve
    var notification = await Mongo.GetCollection<NotificationDb>()
      .Find(n => n.Id == notificationId)
      .FirstOrDefaultAsync();

    if (notification is null)
    {
      return;
    }
    
    if (!notification.NeedsAnswer && notification.Receivers.Where(r => r.User.Id != user.Id).All(r => r.SeenAt is not null))
    {
      await Delete(notificationId);
      return;
    }

    var memberIndex = notification.Receivers.FindIndex(r => r.User.Id == user.Id);
    await Mongo.GetCollection<NotificationDb>()
      .UpdateOneAsync(n => n.Id == notificationId,
        Builders<NotificationDb>.Update.Set(n => n.Receivers[memberIndex].SeenAt, DateTime.Now)
      );
  }

  private static Task<string> Send(string deviceToken, string title, string message, string? jsonPayload = null)
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
    if (jsonPayload is not null)
    {
      firebaseMessage.Data = new Dictionary<string, string> { { "jsonPayload", jsonPayload } };
    }

    return FirebaseMessaging.DefaultInstance.SendAsync(firebaseMessage);
  }
}