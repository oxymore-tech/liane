using System;
using Liane.Api.Auth;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.User;
using Liane.Service.Internal.Util;

namespace Liane.Test.Integration;

public sealed class MockCurrentContext : ICurrentContext
{
  private AuthUser? CurrentAuthUser { get; set; }
  private bool allowPastResources;

  public AuthUser CurrentUser()
  {
    return CurrentAuthUser ?? new AuthUser(Fakers.FakeDbUsers[2].Id, false);
  }

  public void SetCurrentUser(DbUser user, bool isAdmin = false) => SetCurrentUser(user.Id, isAdmin);

  public void SetCurrentUser(User user, bool isAdmin = false) => SetCurrentUser(user.Id!, isAdmin);

  public void SetCurrentUser(string userId, bool isAdmin = false)
  {
    CurrentAuthUser = new AuthUser(userId, isAdmin);
  }

  public T CurrentResource<T>() where T : class, IIdentity
  {
    throw new NotImplementedException();
  }

  public ResourceAccessLevel CurrentResourceAccessLevel()
  {
    throw new NotImplementedException();
  }

  public void SetAllowPastResourceCreation(bool allow)
  {
    allowPastResources = allow;
  }

  public bool AllowPastResourceCreation()
  {
    return allowPastResources;
  }
}