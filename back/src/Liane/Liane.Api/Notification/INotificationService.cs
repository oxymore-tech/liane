using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Notification;

public interface INotificationService : IResourceResolverService<NotificationPayload>
{
  /// <summary>
  /// Create and send a notification to a user
  /// </summary>
  Task Create<T>(T linkedEvent, ImmutableList<Ref<User.User>> receivers) where T : IEntity;

  Task Create<T>(T linkedEvent, Ref<Api.User.User> receiver) where T : IEntity;

  Task Delete(string linkedEventId);

  Task<int> GetUnreadCount(Ref<Api.User.User> user);

  Task<PaginatedResponse<Notification>> List(Ref<User.User> user, Pagination pagination);

  Task MarkAsRead(string notificationId, Ref<Api.User.User> user);
}