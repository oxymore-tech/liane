using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Notification;

public interface INotificationService : IResourceResolverService<BaseNotification>
{

  /// <summary>
  /// Create and send a notification to a user
  /// </summary>
  Task<BaseNotification> Create<T>(T linkedEvent, Ref<Api.User.User> receiver) where T : class;

  Task<int> GetUnreadCount(Ref<Api.User.User> user);
}