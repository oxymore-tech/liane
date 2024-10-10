using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;

namespace Liane.Api.Hub;

public interface IHubClient
{
  Task ReceiveUnreadOverview(UnreadOverview unreadOverview);

  Task<bool> ReceiveNotification(Notification notification);

  Task<bool> ReceiveLianeMessage(string conversationId, LianeMessage message);
  Task ReceiveLatestLianeMessages(PaginatedResponse<LianeMessage> messages);

  Task Me(FullUser user);

  Task ReceiveTrackingInfo(TrackingInfo update);

  Task ReceiveLianeUpdate(Trip.Trip trip);
}