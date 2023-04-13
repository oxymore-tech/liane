using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Logging;
using Notification = Liane.Api.Event.Notification;

namespace Liane.Service.Internal.Event;

public sealed class PushServiceImpl : IPushService, IEventListener
{
  private readonly IUserService userService;
  private readonly IHubService hubService;
  private readonly ILogger<PushServiceImpl> logger;
  private readonly JsonSerializerOptions jsonSerializerOptions;
  private readonly INotificationService notificationService;

  public PushServiceImpl(FirebaseSettings firebaseSettings, ILogger<PushServiceImpl> logger, IHubService hubService, JsonSerializerOptions jsonSerializerOptions, IUserService userService,
    INotificationService notificationService)
  {
    this.logger = logger;
    this.hubService = hubService;
    this.jsonSerializerOptions = jsonSerializerOptions;
    this.userService = userService;
    this.notificationService = notificationService;
    if (firebaseSettings.ServiceAccountFile is null)
    {
      logger.LogWarning("Unable to init firebase because service account file is missing");
    }
    else
    {
      FirebaseApp.Create(new AppOptions { Credential = GoogleCredential.FromFile(firebaseSettings.ServiceAccountFile) });
    }
  }

  public async Task Notify(Ref<Api.User.User> receiver, Notification notification)
  {
    if (await hubService.TrySendNotification(receiver, notification))
    {
      return;
    }

    await SendTo(receiver, notification);
  }

  public async Task SendChatMessage(ImmutableList<Ref<Api.User.User>> receiver, Ref<ConversationGroup> conversation, ChatMessage message)
  {
    var tasks = receiver.Select(r => SendChatMessage(r, conversation, message));
    await Task.WhenAll(tasks);
  }

  public async Task SendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message)
  {
    if (await hubService.TrySendChatMessage(receiver, conversation, message))
    {
      return;
    }

    // User is not connected so send detailed notification  
    // var authorUser = await userService.Get(author);
    //TODO await notificationService.SendTo(info.User, nameof(NewConversationMessage), new NewConversationMessage(groupId, authorUser, sent));
  }

  public async Task OnEvent(Api.Event.Event @event, Api.Event.Event? answersToEvent)
  {
    var notification = await notificationService.Get(@event);
    await Task.WhenAll(@event.Recipients.Select(r => Notify(r.User, notification)));
  }

  private async Task SendTo(Ref<Api.User.User> receiver, Notification notification)
  {
    var receiverUser = await userService.GetFullUser(receiver);
    if (receiverUser == null)
    {
      throw new ArgumentNullException("No user with Id " + receiver.Id);
    }

    if (receiverUser.PushToken is null)
    {
      throw new ValidationException("pushToken", ValidationMessage.IsRequired);
    }

    try
    {
      await Send(receiverUser.PushToken, notification);
    }
    catch (FirebaseMessagingException e)
    {
      logger.LogWarning(e, "Unable to send push notification using firebase to user {receiver}", receiver.Id);
    }
  }

  private Task<string> Send(string deviceToken, Notification notification)
  {
    var firebaseMessage = new Message
    {
      Token = deviceToken,
      Notification = new FirebaseAdmin.Messaging.Notification
      {
        Title = notification.Title,
        Body = notification.Message
      }
    };
    if (notification.Payload is null)
    {
      return FirebaseMessaging.DefaultInstance.SendAsync(firebaseMessage);
    }

    var jsonPayload = JsonSerializer.Serialize(notification.Payload, jsonSerializerOptions);
    firebaseMessage.Data = new Dictionary<string, string> { { "jsonPayload", jsonPayload } };
    return FirebaseMessaging.DefaultInstance.SendAsync(firebaseMessage);
  }
}