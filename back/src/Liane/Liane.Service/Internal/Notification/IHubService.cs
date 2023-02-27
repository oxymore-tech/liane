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

  void AddConnectedUser(Ref<Api.User.User> user);

  void RemoveUser(Ref<Api.User.User> user);

  Task<bool> TrySendNotification(Ref<Api.User.User> receiver, BaseNotification notification);
  
  Task<bool> TrySendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message);
}