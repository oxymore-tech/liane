using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Notification;

public sealed record Notification<T>(
  string? Id,
  DateTime CreatedAt,
  T Event
) : BaseNotification(Id, CreatedAt, nameof(T)) where T : class;

public abstract record BaseNotification(
  string? Id, 
  DateTime CreatedAt, 
  string Type) : IIdentity;