using System;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.Notification;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.User;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Notification;

public sealed class NotificationServiceImpl : BaseMongoCrudService<BaseNotificationDb, BaseNotification>, INotificationService, ISendNotificationService
{
  private readonly IUserService userService;
  private readonly JsonSerializerOptions jsonSerializerOptions;
  private readonly IHubService hubService;

  public NotificationServiceImpl(
    FirebaseSettings firebaseSettings, 
    IUserService userService,
    ILogger<NotificationServiceImpl> logger, 
    IMongoDatabase database, 
    JsonSerializerOptions jsonSerializerOptions, IHubService hubService) : base(database)
  {
    this.userService = userService;
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
  
  private async Task SendNotificationTo(Ref<Api.User.User> receiver, BaseNotification notification)
  {
    // Try send via hub direct connection
    if (await hubService.TrySendNotification(receiver, notification))
    {
     return;
      
    }
    // Otherwise send via FCM
    await SendTo(receiver, "Notification", notification);
  }

  public async Task<string> SendTo(Ref<Api.User.User> receiver, string title, object message)
  {
    var receiverUser = await ResolveRef<DbUser>(receiver);
    if (receiverUser == null) throw new ArgumentNullException("No user with Id "+receiver.Id);

     
    if (receiverUser.PushToken is null)
    {
      throw new ValidationException("pushToken", ValidationMessage.IsRequired);
    }

    // For now just send the whole notification object in json
    var jsonObject = JsonSerializer.Serialize(message, jsonSerializerOptions);
    return await Send(receiverUser.PushToken, title, jsonObject);
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

  public Task<string> Send(string deviceToken, string title, string message)
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
    return FirebaseMessaging.DefaultInstance.SendAsync(firebaseMessage);
  }

  private BaseNotification MapEntityClass<T>(NotificationDb<T> dbRecord) where T : class
  {
    return new BaseNotification.Notification<T>(dbRecord.Id, dbRecord.CreatedAt, dbRecord.Event);
  }

  protected override Task<BaseNotification> MapEntity(BaseNotificationDb dbRecord)
  {
    var type = dbRecord.GetType();
    if (!type.GetTypeInfo().IsAssignableFrom(typeof(NotificationDb<>)))
    {
      throw new ArgumentException("Bad NotificationDb type : " + nameof(type));
    }
    var eventType = type.GetGenericArguments()[0];
    var method = typeof(NotificationServiceImpl).GetMethod(nameof(MapEntityClass))!;
    var generic = method.MakeGenericMethod(eventType);
    return (Task<BaseNotification>)generic.Invoke(this, new object?[]{dbRecord})!;
  }

  public async Task<BaseNotification> Create<T>(T linkedEvent, Ref<Api.User.User> receiver) where T : class
  {
    var timestamp = DateTime.Now;
    var dbRecord = new NotificationDb<T>(ObjectId.GenerateNewId().ToString(),  linkedEvent, receiver, timestamp);
    await Mongo.GetCollection<BaseNotificationDb>().InsertOneAsync(dbRecord);
    var notification = new BaseNotification.Notification<T>(dbRecord.Id, timestamp, linkedEvent);
    
    // Send notification 
    Task.Run(() => SendNotificationTo(receiver, notification));
    
    return notification;
  }

  public async Task<int> GetUnreadCount(Ref<Api.User.User> user)
  {
    var resolvedUser = await ResolveRef<DbUser>(user);
    var unreadCount = await Mongo.GetCollection<BaseNotificationDb>()
      .Find(n => n.Id == user.Id && resolvedUser!.LastConnection < n.CreatedAt)
      .CountDocumentsAsync();
    return (int)Math.Min(int.MaxValue, unreadCount);
  }
}