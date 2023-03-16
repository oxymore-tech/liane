using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public interface IPushService
{
  Task Notify(Ref<Api.User.User> receiver, Notification notification);
}