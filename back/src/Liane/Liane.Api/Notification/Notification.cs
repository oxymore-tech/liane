using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Notification;

public sealed record Notification(
  string title,
  string message,
  NotificationPayload Payload
);
public abstract record NotificationPayload(
  string? Id,
  bool Seen,
  DateTime CreatedAt) : IIdentity
{
  public sealed record WithEvent<T>(
    string? Id,
    DateTime CreatedAt,
    T Event,
    bool Seen = false
  ) : NotificationPayload(Id, Seen, CreatedAt) where T : class
  {
    public string Type => typeof(T).Name;
  }
}
  