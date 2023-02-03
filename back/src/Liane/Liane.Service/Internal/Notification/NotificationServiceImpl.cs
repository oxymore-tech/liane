using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.User;
using Microsoft.Extensions.Logging;
using Twilio;
using Twilio.Rest.Api.V2010.Account;

namespace Liane.Service.Internal.Notification;

public sealed class NotificationServiceImpl : INotificationService
{
  private readonly IUserService userService;
  private readonly TwilioSettings twilioSettings;

  public NotificationServiceImpl(FirebaseSettings firebaseSettings, IUserService userService, ILogger<NotificationServiceImpl> logger, TwilioSettings twilioSettings)
  {
    this.userService = userService;
    this.twilioSettings = twilioSettings;
    if (firebaseSettings.ServiceAccountFile is null)
    {
      logger.LogWarning("Unable to init firebase because service account file is missing");
    }

    if (firebaseSettings.ServiceAccountFile is null)
    {
      return;
    }

    FirebaseApp.Create(new AppOptions { Credential = GoogleCredential.FromFile(firebaseSettings.ServiceAccountFile) });
  }

  public async Task<string> SendTo(string phone, string title, string message)
  {
    var user = await userService.GetByPhone(phone);
    if (user.PushToken is null)
    {
      throw new ValidationException("pushToken", ValidationMessage.IsRequired);
    }

    TwilioClient.Init(twilioSettings.Account, twilioSettings.Token);

    await MessageResource.CreateAsync(
      body: $"Vous êtes invité à rejoindre une liane https://dev.liane.app",
      from: twilioSettings.From.ToPhoneNumber(),
      to: phone.ToPhoneNumber()
    );
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