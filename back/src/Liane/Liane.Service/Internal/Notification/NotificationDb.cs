using System;
using System.Collections.Immutable;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Notification;


public sealed record Receiver(Ref<Api.User.User> User, DateTime? SeenAt = null);

public abstract record NotificationDb(
  string? Id,
  ImmutableList<Receiver> Receivers,
  DateTime CreatedAt
) : IIdentity
{
  public sealed record WithEvent<T>(
    string? Id,
    T Event,
    ImmutableList<Receiver> Receivers,
    DateTime CreatedAt
  ) : NotificationDb(Id, Receivers, CreatedAt) where T : class;
}