using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Notification;

public interface ISendNotificationService : IResourceResolverService<NotificationPayload>
{
  Task<string> SendTo(string phone, string title, string message);
  Task<string> SendTo(Ref<Api.User.User> receiver, string title, string message, object? payload);
}