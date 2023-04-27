using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Text.Json;
using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.Chat;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Logging;
using Notification = Liane.Api.Event.Notification;

namespace Liane.Service.Internal.Event;

public sealed class FirebaseServiceImpl : IPushMiddleware
{
  private readonly IUserService userService;
  private readonly ILogger<FirebaseServiceImpl> logger;
  private readonly JsonSerializerOptions jsonSerializerOptions;

  public FirebaseServiceImpl(FirebaseSettings firebaseSettings, ILogger<FirebaseServiceImpl> logger, JsonSerializerOptions jsonSerializerOptions, IUserService userService)
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

  public Task<bool> SendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message)
  {
    return Task.FromResult(false);
  }

  private Task<string> Send(string deviceToken, Notification notification)
  {
    var firebaseMessage = new Message
    {
      Token = deviceToken,
      Notification = new FirebaseAdmin.Messaging.Notification()
      {
        Title = notification.Title,
        Body = notification.Message
      },
      Data = notification switch
      {
        Notification.Reminder r => BuildPayLoad(r),
        Notification.Event r => BuildPayLoad(r),
        _ => ImmutableDictionary<string, string>.Empty
      }
    };

    return FirebaseMessaging.DefaultInstance.SendAsync(firebaseMessage);
  }

  private IReadOnlyDictionary<string, string> BuildPayLoad(object payload)
  {
    var jsonPayload = JsonSerializer.Serialize(payload, jsonSerializerOptions);
    return new Dictionary<string, string> { { "jsonPayload", jsonPayload } };
  }
}