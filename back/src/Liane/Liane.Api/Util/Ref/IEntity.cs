using System;

namespace Liane.Api.Util.Ref;

public interface IEntity : IIdentity
{
  Ref<Auth.User>? CreatedBy { get; }
  DateTime? CreatedAt { get; }
}

public interface IEntity<out T> : IEntity, IIdentity<T>;