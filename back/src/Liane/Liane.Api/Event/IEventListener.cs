using System.Threading.Tasks;

namespace Liane.Api.Event;

public interface IEventListener
{
  Task OnEvent(Event e, Event? answersToEvent);
}

public interface IEventListener<in TEvent> : IEventListener
  where TEvent : LianeEvent
{
  Task IEventListener.OnEvent(Event e, Event? answersToEvent)
  {
    return e.LianeEvent.GetType().IsAssignableTo(typeof(TEvent)) ? OnEvent(e, (TEvent)e.LianeEvent, answersToEvent) : Task.CompletedTask;
  }

  Task OnEvent(Event e, TEvent lianeEvent, Event? answersToEvent);
}