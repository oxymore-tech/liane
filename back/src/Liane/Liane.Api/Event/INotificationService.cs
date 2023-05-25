using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface INotificationService : ICrudService<Notification>
{
  Task<PaginatedResponse<Notification>> List(NotificationFilter notificationFilter, Pagination pagination);

  Task<Notification> SendInfo(string title, string message, Ref<User.User> to);

  Task<Notification> SendEvent(string title, string message, Ref<User.User> to, LianeEvent lianeEvent, params Answer[] answers);

  Task<Notification> SendReminder(string title, string message, ImmutableList<Ref<Api.User.User>> to, Reminder reminder);

  Task Answer(Ref<Notification> id, Answer answer);

  Task MarkAsRead(Ref<Notification> id);

  Task<int> GetUnreadCount(Ref<User.User> userId);
}