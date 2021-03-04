using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Notification
{
    public interface INotificationService
    {
        Task<ImmutableList<Notification>> getNotifications();
        Task addNotification(string user, Api.Notification.Notification notification);
        Task deleteNotification(int date);
    }
}