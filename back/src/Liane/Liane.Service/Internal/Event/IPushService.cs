using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public enum Priority
{
  High,
  Low
}

public interface IPushMiddleware
{
  Priority Priority { get; }
  Task<bool> Push(Ref<Api.Auth.User> receiver, Notification notification);
  Task<bool> PushMessage(Api.Auth.User sender, Ref<Api.Auth.User> receiver, Ref<Api.Community.Liane> liane, LianeMessage message);
}

public interface IPushService
{
  Task<bool> Push(Ref<Api.Auth.User> receiver, Notification notification);
  Task PushMessage(Ref<Api.Community.Liane> liane, LianeMessage message);
}