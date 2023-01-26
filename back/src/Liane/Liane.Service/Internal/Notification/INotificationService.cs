using System.Threading.Tasks;

namespace Liane.Service.Internal.Notification;

public interface INotificationService
{
  Task<string> SendAsync(string deviceToken, string title, string message);
}