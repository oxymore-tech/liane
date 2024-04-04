using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Auth;
using Liane.Api.Util.Pagination;

namespace Liane.Api.Hub;

public interface IHubClient
{
  Task ReceiveUnreadOverview(UnreadOverview unreadOverview);

  Task<bool> ReceiveNotification(Notification notification);

  Task<bool> ReceiveMessage(string conversationId, ChatMessage message);

  Task ReceiveLatestMessages(PaginatedResponse<ChatMessage> messages);

  Task Me(FullUser user);
  
  Task ReceiveTrackingInfo(TrackingInfo update);
  
  Task ReceiveLianeUpdate(Trip.Trip trip);

}