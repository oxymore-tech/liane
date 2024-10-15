using System;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Community;
using Liane.Api.Event;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Event;

public sealed class EventDispatcher(
  IServiceProvider serviceProvider,
  ICurrentContext currentContext,
  ILogger<EventDispatcher> logger)
{
  public Task Dispatch(Ref<Api.Community.Liane> liane, MessageContent content) => Dispatch(liane, content, currentContext.CurrentUser().Id);

  private async Task Dispatch(Ref<Api.Community.Liane> liane, MessageContent content, Ref<Api.Auth.User> sender)
  {
    // ReSharper disable once ConditionIsAlwaysTrueOrFalseAccordingToNullableAPIContract
    if (liane is null)
    {
      logger.LogWarning("Event is not dispatched because liane is null : {Message}", content);
      return;
    }

    var lianeEvent = new LianeEvent<MessageContent>(liane, content, DateTime.UtcNow, sender);
    var eventListeners = serviceProvider.GetServices<IEventListener>()
      .Distinct();
    foreach (var eventListener in eventListeners)
    {
      await eventListener.OnEvent(lianeEvent);
    }
  }
}