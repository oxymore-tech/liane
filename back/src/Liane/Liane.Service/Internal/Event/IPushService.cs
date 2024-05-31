using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Community;
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

  Task<bool> SendNotification(Ref<Api.Auth.User> receiver, Notification notification);

  Task<bool> SendChatMessage(Ref<Api.Auth.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message);
  
  Task<bool> SendLianeMessage(Ref<Api.Auth.User> receiver, Ref<Api.Community.Liane> conversation, LianeMessage message);
}

public interface IPushService
{
  Task<bool> SendNotification(Ref<Api.Auth.User> receiver, Notification notification);

  Task<bool> SendChatMessage(Ref<Api.Auth.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message);

  Task SendChatMessage(ImmutableList<Ref<Api.Auth.User>> receiver, Ref<ConversationGroup> conversation, ChatMessage message) =>
    Task.WhenAll(receiver.Select(r => SendChatMessage(r, conversation, message)));
  
  Task<bool> SendLianeMessage(Ref<Api.Auth.User> receiver, Ref<Api.Community.Liane> conversation, LianeMessage message);

  Task SendLianeMessage(ImmutableList<Ref<Api.Auth.User>> receiver, Ref<Api.Community.Liane> conversation, LianeMessage message) =>
    Task.WhenAll(receiver.Select(r => SendLianeMessage(r, conversation, message)));
}