using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Text.Json;
using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.User;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Logging;
using Notification = Liane.Api.Event.Notification;

namespace Liane.Service.Internal.Event;

public sealed class FirebaseMessagingImpl : IPushMiddleware
{
  private readonly IUserService userService;
  private readonly ILogger<FirebaseMessagingImpl> logger;
  private readonly JsonSerializerOptions jsonSerializerOptions;

  public FirebaseMessagingImpl(FirebaseSettings firebaseSettings, ILogger<FirebaseMessagingImpl> logger, JsonSerializerOptions jsonSerializerOptions, IUserService userService)
  {
    this.logger = logger;
    this.jsonSerializerOptions = jsonSerializerOptions;
    this.userService = userService;
    if (firebaseSettings.ServiceAccountFile is null)
    {
      logger.LogWarning("Unable to init firebase because service account file is missing");
    }
    else
    {
      FirebaseApp.Create(new AppOptions { Credential = GoogleCredential.FromFile(firebaseSettings.ServiceAccountFile) });
    }
  }

  public Priority Priority => Priority.Low;

  public async Task<bool> SendNotification(Ref<Api.User.User> receiver, Notification notification)
  {
    var receiverUser = await userService.GetFullUser(receiver);
    if (receiverUser == null)
    {
      throw new ArgumentNullException("No user with Id " + receiver.Id);
    }

    if (receiverUser.PushToken is null)
    {
      logger.LogWarning("Unable to send push notification to user {receiver} : no push token", receiver.Id);
      return false;
    }

    try
    {
      await Send(receiverUser.PushToken, notification);
      return true;
    }
    catch (FirebaseMessagingException e)
    {
      logger.LogWarning(e, "Unable to send push notification using firebase to user {receiver}", receiver.Id);
    }

    return false;
  }

  public async Task<bool> SendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message)
  {
    var receiverUser = await userService.GetFullUser(receiver);
    if (receiverUser.PushToken is null)
    {
      logger.LogWarning("Unable to send push notification to user {receiver} : no push token", receiver.Id);
      return false;
    }

    var sender = await userService.Get(message.CreatedBy!);
    var notification = new Notification.NewMessage(
      null,
      sender,
      message.CreatedAt!.Value,
      ImmutableList.Create(new Recipient(receiver)),
      ImmutableHashSet<Answer>.Empty,
      sender.Pseudo,
      message.Text,
      conversation.Id);

    try
    {
      await Send(receiverUser.PushToken, notification);
      return true;
    }
    catch (FirebaseMessagingException e)
    {
      logger.LogWarning(e, "Unable to send push notification using firebase to user {receiver}", receiver.Id);
    }

    return false;
  }

  private Message GetFirebaseMessage(Notification notification)
  {
    return notification switch
    {
      Notification.Reminder r => new Message
      {
        Notification = new FirebaseAdmin.Messaging.Notification
        {
          Title = notification.Title,
          Body = notification.Message,
        },

        Apns = new ApnsConfig { Aps = new Aps { ContentAvailable = true } },
        Android = new AndroidConfig { Priority = FirebaseAdmin.Messaging.Priority.High },
        Data = BuildPayLoad(r),
      },
      Notification.Event r => new Message
      {
        Notification = new FirebaseAdmin.Messaging.Notification
        {
          Title = notification.Title,
          Body = notification.Message,
        },
        Android = new AndroidConfig { Priority = FirebaseAdmin.Messaging.Priority.Normal },
        Data = BuildUri(r).GetOrDefault(u => new Dictionary<string, string> {{"uri", u }})
      },
      _ => new Message 
      {
        Notification = new FirebaseAdmin.Messaging.Notification
        {
          Title = notification.Title,
          Body = notification.Message,
        },
        Data = BuildUri(notification).GetOrDefault(u => new Dictionary<string, string> {{"uri", u }})
      }
    };
  }

  private Task<string> Send(string deviceToken, Notification notification)
  {
    if (FirebaseMessaging.DefaultInstance is null)
    {
      return Task.FromResult("noop");
    }

    var firebaseMessage = GetFirebaseMessage(notification);
    firebaseMessage.Token = deviceToken;


    return FirebaseMessaging.DefaultInstance.SendAsync(firebaseMessage);
  }

  private string? BuildUri(Notification notification)
  {
    return notification switch
    {
      Notification.Event e => e.Payload switch
      {
        LianeEvent.JoinRequest => "liane://join_request/"+ notification.Id,
        LianeEvent.MemberAccepted m => "liane://liane/"+m.Liane.Id,
        _ => null
      },
      Notification.NewMessage m => "liane://chat/"+m.Conversation.Id,
      _ => null
    };
  }

  private IReadOnlyDictionary<string, string> BuildPayLoad(Notification payload)
  {
    var jsonPayload = JsonSerializer.Serialize(payload, jsonSerializerOptions);
    return new Dictionary<string, string> { { "jsonPayload", jsonPayload } };
  }
}