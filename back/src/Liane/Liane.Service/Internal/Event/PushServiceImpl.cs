using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Community;

namespace Liane.Service.Internal.Event;

public sealed class PushServiceImpl : IPushService
{
  private readonly ImmutableList<IPushMiddleware> pushMiddlewares;
  private readonly LianeFetcher lianeFetcher;
  private readonly IUserService userService;

  public PushServiceImpl(IEnumerable<IPushMiddleware> pushMiddlewares, LianeFetcher lianeFetcher, IUserService userService)
  {
    this.lianeFetcher = lianeFetcher;
    this.userService = userService;
    this.pushMiddlewares = pushMiddlewares.OrderBy(p => p.Priority)
      .ToImmutableList();
  }

  public async Task PushMessage(Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    var resolvedLiane = await lianeFetcher.Get(liane.IdAsGuid());
    var sender = await userService.Get(message.CreatedBy);
    foreach (var member in resolvedLiane.Members)
    {
      await PushMessageInternal(sender, member.User, resolvedLiane, message);
    }
  }

  private async Task PushMessageInternal(Api.Auth.User sender, Ref<Api.Auth.User> receiver, Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.PushMessage(sender, receiver, liane, message))
      {
        return;
      }
    }
  }

  public async Task<bool> Push(Ref<Api.Auth.User> receiver, Notification notification)
  {
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.Push(receiver, notification))
      {
        return true;
      }
    }

    return false;
  }
}