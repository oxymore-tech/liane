using System;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public interface IHubService
{
  Task AddConnectedUser(Ref<Api.Auth.User> user, string connectionId);
  Task RemoveUser(Ref<Api.Auth.User> user);
  Task PushUserUpdate(FullUser user);
  Task PushLianeUpdateTo(Guid? lianeOrRequest, Ref<Api.Auth.User> recipient);
  Task PushTripUpdateTo(Api.Trip.Trip trip, Ref<Api.Auth.User> recipient);
}