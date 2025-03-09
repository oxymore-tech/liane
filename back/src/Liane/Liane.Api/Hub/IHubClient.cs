using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Hub;

public interface IHubClient
{
  Task ReceiveUnreadOverview(ImmutableDictionary<Ref<LianeRequest>, int> unreadOverview);

  Task<bool> ReceiveLianeMessage(string conversationId, LianeMessage message);

  Task Me(FullUser user);

  Task ReceiveTrackingInfo(TrackingInfo update);

  Task ReceiveTripUpdate(Trip.Trip trip);

  Task ReceiveLianeUpdate(Community.Liane liane);
}