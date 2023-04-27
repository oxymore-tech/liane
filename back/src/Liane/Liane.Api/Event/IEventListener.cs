using System;
using System.Threading.Tasks;

namespace Liane.Api.Event;

public interface IEventListener
{
  Task OnEvent(LianeEvent e);
  Task OnAnswer(LianeEvent e, Answer answer);
}

public interface IEventListener<in TEvent> : IEventListener
  where TEvent : LianeEvent
{
  Task IEventListener.OnEvent(LianeEvent e)
  {
    return e.GetType().IsAssignableTo(typeof(TEvent)) ? OnEvent((TEvent)e) : Task.CompletedTask;
  }

  Task IEventListener.OnAnswer(LianeEvent e, Answer answer)
  {
    return e.GetType().IsAssignableTo(typeof(TEvent)) ? OnAnswer((TEvent)e, answer) : Task.CompletedTask;
  }

  Task OnEvent(TEvent lianeEvent);

  Task OnAnswer(TEvent lianeEvent, Answer answer)
  {
    throw new NotImplementedException();
  }
}