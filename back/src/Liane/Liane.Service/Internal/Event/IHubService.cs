using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public interface IHubService
{
  bool IsConnected(Ref<Api.User.User> user);

  Task AddConnectedUser(Ref<Api.User.User> user, string connectionId);

  Task RemoveUser(Ref<Api.User.User> user, string connectionId);

  Task<bool> TrySendNotification(Ref<Api.User.User> receiver, Notification notification);

  Task<bool> TrySendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message);
}