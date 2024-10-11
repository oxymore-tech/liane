using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.DependencyInjection;

namespace Liane.Service.Internal.Event;

public sealed class EventDispatcher(IServiceProvider serviceProvider, ICurrentContext currentContext)
{
  public Task Dispatch(LianeEvent e) => Dispatch(e, currentContext.CurrentUser().Id);

  public async Task Dispatch(LianeEvent e, Ref<Api.Auth.User> sender)
  {
    var eventListeners = serviceProvider.GetServices<IEventListener>();
    foreach (var eventListener in eventListeners)
    {
      await eventListener.OnEvent(e, sender);
    }
  }
}