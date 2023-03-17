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

  public void Dispatch(Api.Event.Event e, Api.Event.Event? answersToEvent)
  {
    var listeners = serviceProvider.GetServices<IEventListener>();
    foreach (var eventListener in listeners)
    {
      var _ = Task.Run(() => eventListener.OnEvent(e, answersToEvent));
    }
  }
}