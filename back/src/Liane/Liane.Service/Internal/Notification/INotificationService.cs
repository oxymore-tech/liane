using System.Threading.Tasks;

namespace Liane.Service.Internal.Notification;

public interface INotificationService
{
  Task<string> SendTo(string phone, string title, string message);

  Task<string> Send(string deviceToken, string title, string message);
}