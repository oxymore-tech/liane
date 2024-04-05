using System;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record NotificationFilter(
  Ref<Auth.User>? Recipient,
  Ref<Auth.User>? Sender,
  Ref<Trip.Trip>? Liane,
  PayloadType? PayloadType
);

public abstract record PayloadType
{
  public static PayloadType FromType(string type)
  {
    var payloadType = type.MatchSubType<PayloadType>();

    if (payloadType is not null)
    {
      return (PayloadType)Activator.CreateInstance(payloadType)!;
    }

    var lianeEventType = type.MatchSubType<TripEvent>();
    if (lianeEventType is null)
    {
      throw new ValidationException(nameof(type), ValidationMessage.UnknownValue);
    }

    var makeGenericType = typeof(Event<>).MakeGenericType(lianeEventType);
    return (PayloadType)Activator.CreateInstance(makeGenericType)!;
  }

  public sealed record Info : PayloadType;

  public sealed record Reminder : PayloadType;

  public record Event : PayloadType
  {
    public virtual Type? SubType => null;
  }

  public sealed record Event<T> : Event where T : TripEvent
  {
    public override Type SubType => typeof(T);
  }
}