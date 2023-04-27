using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public interface IHubService
{
  bool IsConnected(Ref<Api.User.User> user);

  Task AddConnectedUser(Ref<Api.User.User> user, string connectionId);

  Task RemoveUser(Ref<Api.User.User> user, string connectionId);
}