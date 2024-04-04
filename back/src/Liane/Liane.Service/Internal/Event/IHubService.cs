using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public interface IHubService
{
  bool IsConnected(Ref<Api.Auth.User> user);

  Task AddConnectedUser(Ref<Api.Auth.User> user, string connectionId);

  Task RemoveUser(Ref<Api.Auth.User> user, string connectionId);

  Task PushUserUpdate(FullUser user);
}