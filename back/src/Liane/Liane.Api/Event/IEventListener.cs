using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface IEventListener
{
  Task OnEvent(LianeEvent e, Ref<User> sender);
}

public interface IEventListener<in TEvent> : IEventListener
  where TEvent : LianeEvent
{
  Task IEventListener.OnEvent(LianeEvent e, Ref<User> sender)
  {
    return e.GetType().IsAssignableTo(typeof(TEvent)) ? OnEvent((TEvent)e, sender) : Task.CompletedTask;
  }

  Task OnEvent(TEvent lianeEvent, Ref<User> sender);
}