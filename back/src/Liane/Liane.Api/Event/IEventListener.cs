using System;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record LianeEvent<T>(
  Ref<Community.Liane> Liane,
  T Content,
  DateTime At,
  Ref<User> Sender
) where T : MessageContent
{
  public Ref<Trip.Trip>? PublishTripUpdate => Content is MessageContent.TripMessage m ? m.Trip : null;

  public bool PublishLianeUpdate => Content switch
  {
    MessageContent.LianeRequestModified => false,
    MessageContent.Text => false,
    MessageContent.GeolocationLevelChanged => false,
    _ => true
  };
}

public interface IEventListener
{
  Task OnEvent(LianeEvent<MessageContent> e);
}

public interface IEventListener<TEvent> : IEventListener
  where TEvent : MessageContent
{
  Task IEventListener.OnEvent(LianeEvent<MessageContent> e) =>
    e.Content is TEvent content
      ? OnEvent(new LianeEvent<TEvent>(e.Liane, content, e.At, e.Sender))
      : Task.CompletedTask;

  Task OnEvent(LianeEvent<TEvent> lianeEvent);
}