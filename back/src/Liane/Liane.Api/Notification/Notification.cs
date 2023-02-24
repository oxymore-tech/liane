using System;
using System.Text.Json.Serialization;
using Liane.Api.Util.Ref;

namespace Liane.Api.Notification;

public abstract record BaseNotification(
  string? Id,
  DateTime CreatedAt) : IIdentity
{
  public sealed record Notification<T>(
    string? Id,
    DateTime CreatedAt,
    T Event
  ) : BaseNotification(Id, CreatedAt) where T : class;
}
  