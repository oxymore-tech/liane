using System;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface IEventListener
{
  Task OnEvent(TripEvent e, Ref<Auth.User>? sender = null);
  Task OnAnswer(Notification.Event e, Answer answer, Ref<Auth.User>? sender = null);
}

public interface IEventListener<in TEvent> : IEventListener
  where TEvent : TripEvent
{
  Task IEventListener.OnEvent(TripEvent e, Ref<Auth.User>? sender)
  {
    return e.GetType().IsAssignableTo(typeof(TEvent)) ? OnEvent((TEvent)e, sender) : Task.CompletedTask;
  }

  Task IEventListener.OnAnswer(Notification.Event e, Answer answer, Ref<Auth.User>? sender)
  {
    return e.Payload.GetType().IsAssignableTo(typeof(TEvent)) ? OnAnswer(e, (TEvent)e.Payload, answer, sender) : Task.CompletedTask;
  }

  Task OnEvent(TEvent e, Ref<Auth.User>? sender = null);

  Task OnAnswer(Notification.Event e, TEvent tripEvent, Answer answer, Ref<Auth.User>? sender = null)
  {
    throw new NotImplementedException();
  }
}