using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Liane.Api.User;

namespace Liane.Service.Internal.Notification;

public sealed class NotificationServiceImpl : INotificationService
{
  private readonly IUserService userService;

  public NotificationServiceImpl(FirebaseSettings firebaseSettings, IUserService userService)
  {
    FirebaseApp.Create(new AppOptions { Credential = GoogleCredential.FromFile(firebaseSettings.ServiceAccountFile) });
    this.userService = userService;
  }

  public async Task<string> SendTo(string phone, string title, string message)
  {
    var user =await  userService.GetByPhone(phone);
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