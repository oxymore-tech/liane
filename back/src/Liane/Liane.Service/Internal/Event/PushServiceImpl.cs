using System;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Community;
using Microsoft.Extensions.DependencyInjection;

namespace Liane.Service.Internal.Event;

public sealed class PushServiceImpl(IServiceProvider serviceProvider, LianeFetcher lianeFetcher, IUserService userService) : IPushService
{
  public async Task PushMessage(Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    var resolvedLiane = await lianeFetcher.Get(liane.IdAsGuid());
    var sender = await userService.Get(message.CreatedBy);
    if (resolvedLiane.Members.IsEmpty)
    {
      await PushMessageInternal(sender, resolvedLiane.CreatedBy, resolvedLiane, message);
      return;
    }

    foreach (var member in resolvedLiane.Members)
    {
      await PushMessageInternal(sender, member.User, resolvedLiane, message);
    }
  }

  private async Task PushMessageInternal(Api.Auth.User sender, Ref<Api.Auth.User> receiver, Ref<Api.Community.Liane> liane, LianeMessage message)
  {
    var pushMiddlewares = GetPushMiddlewares();
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
    var pushMiddlewares = GetPushMiddlewares();
    foreach (var pushService in pushMiddlewares)
    {
      if (await pushService.Push(receiver, notification))
      {
        return true;
      }
    }

    return false;
  }

  private IOrderedEnumerable<IPushMiddleware> GetPushMiddlewares()
  {
    return serviceProvider.GetServices<IPushMiddleware>()
      .Distinct()
      .OrderBy(p => p.Priority);
  }
}