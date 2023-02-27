using System;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Notification;


public abstract record NotificationDb(
  string? Id,
  Ref<Api.User.User> Receiver,
  DateTime CreatedAt
) : IIdentity
{
  public sealed record WithEvent<T>(
    string? Id,
    T Event,
    Ref<Api.User.User> Receiver,
    DateTime CreatedAt
  ) : NotificationDb(Id, Receiver, CreatedAt) where T : class;
}