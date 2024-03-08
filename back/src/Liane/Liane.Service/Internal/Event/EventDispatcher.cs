using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.DependencyInjection;

namespace Liane.Service.Internal.Event;

public sealed class EventDispatcher
{
  private readonly IServiceProvider serviceProvider;

  public EventDispatcher(IServiceProvider serviceProvider)
  {
    this.serviceProvider = serviceProvider;
  }

  public async Task Dispatch(LianeEvent e, Ref<Api.Auth.User>? sender = null)
  {
    var eventListeners = serviceProvider.GetServices<IEventListener>();
    foreach (var eventListener in eventListeners)
    {
      await eventListener.OnEvent(e, sender);
    }
  }

  public async Task DispatchAnswer(Notification.Event e, Answer answer, Ref<Api.Auth.User>? sender = null)
  {
    var eventListeners = serviceProvider.GetServices<IEventListener>();
    foreach (var eventListener in eventListeners)
    {
      await eventListener.OnAnswer(e, answer, sender);
    }
  }
}