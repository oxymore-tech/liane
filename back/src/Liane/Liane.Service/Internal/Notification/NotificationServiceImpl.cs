using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;

namespace Liane.Service.Internal.Notification;

public sealed class NotificationServiceImpl : INotificationService
{
  public NotificationServiceImpl(FirebaseSettings firebaseSettings)
  {
    FirebaseApp.Create(new AppOptions { Credential = GoogleCredential.FromFile(firebaseSettings.ServiceAccountFile) });
  }

  public Task<string> SendAsync(string deviceToken, string title, string message)
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