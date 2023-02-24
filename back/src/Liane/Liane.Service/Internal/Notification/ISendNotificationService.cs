using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Notification;

public interface ISendNotificationService : IResourceResolverService<BaseNotification>
{
  Task<string> SendTo(string phone, string title, string message);
  Task<string> SendTo(Ref<Api.User.User> receiver, string title, object message);
  Task<string> Send(string deviceToken, string title, string message);
}