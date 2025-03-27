using System;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public interface IHubService
{
  Task AddConnectedUser(Ref<Api.Auth.User> user, string connectionId);
  Task RemoveUser(Ref<Api.Auth.User> user);
  Task PushTrackingInfo(TrackingInfo update, Ref<Api.Auth.User> recipient);
  Task PushUserUpdate(FullUser user);
  Task PushLianeUpdateTo(Guid? lianeOrRequest, Ref<Api.Auth.User> recipient);
  Task PushTripUpdate(Api.Trip.Trip trip);
}