using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Notification
{
    public interface INotificationService
    {
        Task NotifyDriver(string user, string name, string number);
        Task<ImmutableList<Notification>> getNotifications();
        Task DeleteNotification(int date);
    }
}