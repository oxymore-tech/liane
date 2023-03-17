using System;

namespace Liane.Api.Event;

public sealed record Notification(
  string Title,
  string Message,
  INotificationPayload? Payload
);

public interface INotificationPayload
{
  string? Id { get; }
  bool Seen { get; }
  User.User CreatedBy { get; }
  DateTime CreatedAt { get; }
  bool NeedsAnswer { get; }
  object Content { get; }
}

public sealed record NotificationPayload<T>(
  string? Id,
  User.User CreatedBy,
  DateTime CreatedAt,
  bool Seen,
  bool NeedsAnswer,
  T Content) : INotificationPayload
  where T : class
{
  object INotificationPayload.Content => Content;
  public string Type => typeof(T).Name;
}