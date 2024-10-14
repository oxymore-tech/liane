using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Logging;
using Notification = Liane.Api.Event.Notification;

namespace Liane.Service.Internal.Event;

public sealed class FirebaseMessagingImpl : IPushMiddleware
{
  private readonly IUserService userService;
  private readonly ILogger<FirebaseMessagingImpl> logger;

  public FirebaseMessagingImpl(
    FirebaseSettings firebaseSettings,
    ILogger<FirebaseMessagingImpl> logger,
    IUserService userService
  )
  {
    this.logger = logger;
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

  public Task<bool> PushMessage(Api.Auth.User sender, Ref<Api.Auth.User> receiver, Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    return Push(receiver, new Notification(
      default,
      message.CreatedBy,
      message.CreatedAt!.Value,
      ImmutableList<Recipient>.Empty,
      sender.Pseudo,
      message.Content.Value,
      $"liane://liane/{liane.Id}"
    ));
  }

  public async Task<bool> Push(Ref<Api.Auth.User> receiver, Notification notification)
  {
    if (receiver.Id == notification.CreatedBy?.Id)
    {
      return false;
    }
    
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
      await SendInternal(receiverUser.PushToken, notification);
      return true;
    }
    catch (FirebaseMessagingException e)
    {
      logger.LogWarning(e, "Unable to send push notification using firebase to user {receiver}", receiver.Id);
    }

    return false;
  }

  private static Message GetFirebaseMessage(Notification notification)
  {
    var data = new Dictionary<string, string>();
    if (notification.Uri is not null)
    {
      data.Add("uri", notification.Uri);
    }

    return new Message
    {
      Notification = new FirebaseAdmin.Messaging.Notification
      {
        Title = notification.Title,
        Body = notification.Message
      },
      Android = new AndroidConfig { Priority = FirebaseAdmin.Messaging.Priority.Normal },
      Data = data
    };
  }

  private static Task<string> SendInternal(string deviceToken, Notification notification)
  {
    if (FirebaseMessaging.DefaultInstance is null)
    {
      return Task.FromResult("noop");
    }

    var firebaseMessage = GetFirebaseMessage(notification);
    firebaseMessage.Token = deviceToken;

    return FirebaseMessaging.DefaultInstance.SendAsync(firebaseMessage);
  }
}