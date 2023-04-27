using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public enum Priority
{
  High,
  Low
}

public interface IPushMiddleware
{
  Priority Priority { get; }

  Task<bool> SendNotification(Ref<Api.User.User> receiver, Notification notification);

  Task<bool> SendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message);
}

public interface IPushService
{
  Task SendNotification(Notification notification);
  Task SendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message);

  Task SendChatMessage(ImmutableList<Ref<Api.User.User>> receiver, Ref<ConversationGroup> conversation, ChatMessage message) =>
    Task.WhenAll(receiver.Select(r => SendChatMessage(r, conversation, message)));
}