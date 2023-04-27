using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Event;

public sealed class PushServiceImpl : IPushService
{
  private readonly ImmutableList<IPushMiddleware> pushMiddlewares;

  public PushServiceImpl(IEnumerable<IPushMiddleware> pushMiddlewares)
  {
    this.pushMiddlewares = pushMiddlewares.OrderBy(p => p.Priority)
      .ToImmutableList();
  }

  public Task SendNotification(Notification notification) => Task.WhenAll(notification.Recipients.Select(r => SendNotification(notification, r)));

  public async Task SendChatMessage(Ref<Api.User.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message)
  {
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.SendChatMessage(receiver, conversation, message))
      {
        return;
      }
    }
  }

  private async Task<bool> SendNotification(Notification notification, Recipient recipient)
  {
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.SendNotification(recipient.User, notification))
      {
        return true;
      }
    }

    return false;
  }
}