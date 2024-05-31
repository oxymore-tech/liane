using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Community;
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

  public async Task<bool> SendChatMessage(Ref<Api.Auth.User> receiver, Ref<ConversationGroup> conversation, ChatMessage message)
  {
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.SendChatMessage(receiver, conversation, message))
      {
        return true;
      }
    }

    return false;
  }

  public async Task<bool> SendLianeMessage(Ref<Api.Auth.User> receiver, Ref<Api.Community.Liane> conversation, LianeMessage message)
  {
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.SendLianeMessage(receiver, conversation, message))
      {
        return true;
      }
    }

    return false;
  }

  public async Task<bool> SendChatMessage(Ref<Api.Auth.User> receiver, Ref<Api.Community.Liane> conversation, LianeMessage message)
  {
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.SendLianeMessage(receiver, conversation, message))
      {
        return true;
      }
    }

    return false;
  }

  public async Task<bool> SendNotification(Ref<Api.Auth.User> receiver, Notification notification)
  {
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.SendNotification(receiver, notification))
      {
        return true;
      }
    }

    return false;
  }
}