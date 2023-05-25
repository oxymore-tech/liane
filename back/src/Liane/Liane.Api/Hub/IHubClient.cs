using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.User;
using Liane.Api.Util.Pagination;

namespace Liane.Api.Hub;

public interface IHubClient
{
  Task ReceiveUnreadOverview(UnreadOverview unreadOverview);

  Task ReceiveNotification(Notification notification);

  Task ReceiveMessage(string conversationId, ChatMessage message);

  Task ReceiveLatestMessages(PaginatedResponse<ChatMessage> messages);

  Task Me(FullUser user);
  
}