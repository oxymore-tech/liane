using System;
using System.Collections.Immutable;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Notification;

public sealed record Receiver(Ref<Api.User.User> User, DateTime? SeenAt = null);

public abstract record NotificationDb(
  string? Id,
  ImmutableList<Receiver> Receivers,
  bool NeedsAnswer,
  DateTime CreatedAt
) : IIdentity
{
  public sealed record WithEvent<T>(
    string? Id,
    T Event,
    bool NeedsAnswer,
    ImmutableList<Receiver> Receivers,
    DateTime CreatedAt
  ) : NotificationDb(Id, Receivers, NeedsAnswer, CreatedAt) where T : IEntity;
}