using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Notification;
using Liane.Api.User;
using Liane.Api.Util.Pagination;

namespace Liane.Api.Hub;

/// <summary>
/// Defines hub client's methods 
/// </summary>
public interface IHubClient
{

  Task ReceiveUnreadOverview(UnreadOverview unreadOverview);
  
  Task ReceiveNotification(BaseNotification notification);
  
  Task ReceiveMessage(string conversationId, ChatMessage message);
  
  Task ReceiveLatestMessages(PaginatedResponse<ChatMessage> messages);
  
  Task Me(FullUser user);
}