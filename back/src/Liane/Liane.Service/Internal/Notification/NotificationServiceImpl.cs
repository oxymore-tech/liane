using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Notification;

public sealed class NotificationServiceImpl : INotificationService
{
  private readonly IUserService userService;

  public NotificationServiceImpl(FirebaseSettings firebaseSettings, IUserService userService, ILogger<NotificationServiceImpl> logger)
  {
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
}