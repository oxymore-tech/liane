using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Microsoft.Extensions.DependencyInjection;

namespace Liane.Service.Internal.Event;

public sealed class EventDispatcher
{
  private readonly IServiceProvider serviceProvider;

  public EventDispatcher(IServiceProvider serviceProvider)
  {
    this.serviceProvider = serviceProvider;
  }

  public async Task Dispatch(LianeEvent e)
  {
    var eventListeners = serviceProvider.GetServices<IEventListener>();
    foreach (var eventListener in eventListeners)
    {
      await eventListener.OnEvent(e);
    }
  }

  public async Task DispatchAnswer(LianeEvent e, Answer answer)
  {
    var eventListeners = serviceProvider.GetServices<IEventListener>();
    foreach (var eventListener in eventListeners)
    {
      await eventListener.OnAnswer(e, answer);
    }
  }
}