using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Notification;

public sealed record Notification(
  string Title,
  string Message,
  NotificationPayload Payload
);

public abstract record NotificationPayload : IIdentity
{
  private NotificationPayload(string? id, bool seen, DateTime createdAt)
  {
    Id = id;
    Seen = seen;
    CreatedAt = createdAt;
  }

  public string? Id { get; init; }
  public bool Seen { get; init; }
  public DateTime CreatedAt { get; init; }

  public sealed record WithEvent<T>(
    string? Id,
    DateTime CreatedAt,
    T Event,
    bool Seen = false
  ) : NotificationPayload(Id, Seen, CreatedAt) where T : IEntity;
}