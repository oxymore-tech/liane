using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public interface IPushService
{
  Task Notify(Ref<Api.User.User> receiver, Notification notification);
  Task SendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message);

  Task SendChatMessage(ImmutableList<Ref<Api.User.User>> receivers, Ref<ConversationGroup> conversation, ChatMessage message) =>
    Task.WhenAll(receivers.Select(r => SendChatMessage(r, conversation, message)));
}