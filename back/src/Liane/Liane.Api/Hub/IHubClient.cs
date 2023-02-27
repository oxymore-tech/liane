using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Notification;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Hub;

/// <summary>
/// Defines hub client's methods 
/// </summary>
public interface IHubClient
{

  Task ReceiveUnreadOverview(UnreadOverview unreadOverview);
  
  Task ReceiveNotification(BaseNotification notification);
  
  Task ReceiveMessage(Ref<ConversationGroup> conversation, ChatMessage message);
  
  Task ReceiveLatestMessages(PaginatedResponse<ChatMessage> messages);
  
  Task Me(FullUser user);
}