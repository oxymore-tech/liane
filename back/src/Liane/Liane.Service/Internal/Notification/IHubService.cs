using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Notification;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Notification;

/// <summary>
/// Hub methods callable from service layer
/// </summary>
public interface IHubService
{
  bool IsConnected(Ref<Api.User.User> user);

  Task AddConnectedUser(Ref<Api.User.User> user, string connexionId);

  Task RemoveUser(Ref<Api.User.User> user, string connectionId);

  Task<bool> TrySendNotification(Ref<Api.User.User> receiver, BaseNotification notification);
  
  Task<bool> TrySendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message);
}