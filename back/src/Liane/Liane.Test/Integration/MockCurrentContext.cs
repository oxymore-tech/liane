using Liane.Api.User;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.User;
using Liane.Service.Internal.Util;

namespace Liane.Test.Integration;

public class MockCurrentContext: ICurrentContext
{

  private AuthUser? currentAuthUser { get; set; }

  public AuthUser CurrentUser()
  {
    return currentAuthUser ?? new AuthUser(Fakers.FakeDbUsers[2].Id, Fakers.FakeDbUsers[2].Phone, false);
  }

  public void SetCurrentUser(DbUser user)
  {
    currentAuthUser = new AuthUser(user.Id, user.Phone, false);
  }

  public T? CurrentResource<T>() where T : class, IIdentity
  {
    throw new System.NotImplementedException();
  }

  public ResourceAccessLevel CurrentResourceAccessLevel()
  {
    throw new System.NotImplementedException();
  }
}