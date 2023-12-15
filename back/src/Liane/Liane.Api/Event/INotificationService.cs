using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface INotificationService : ICrudService<Notification>
{
  Task<PaginatedResponse<Notification>> List(NotificationFilter notificationFilter, Pagination pagination);

  Task<Notification> SendInfo(string title, string message, Ref<User.User> to, string? uri);

  Task<Notification> SendEvent(string title, string message, Ref<Api.User.User> createdBy, Ref<User.User> to, LianeEvent lianeEvent, params Answer[] answers);
  
  Task Answer(Ref<Notification> id, Answer answer);

  Task MarkAsRead(Ref<Notification> id);

  Task MarkAsRead(IEnumerable<Ref<Notification>> ids);

  Task<ImmutableList<Ref<Notification>>> GetUnread(Ref<User.User> userId);

  Task CleanNotifications(IEnumerable<Ref<Trip.Liane>> lianes);
}