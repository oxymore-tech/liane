using System;
using Liane.Api.User;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Util;

public interface IAccessLevelContext<in TDb>
{
  public ResourceAccessLevel AccessLevel { get; }
  public Predicate<TDb> HasAccessLevelPredicate { get; }
}

public interface IAccessLevelContextFactory
{
  public IAccessLevelContext<T> NewAccessLevelContext<T>(ResourceAccessLevel accessLevel, AuthUser? currentUser) where T : class, IIdentity;
}