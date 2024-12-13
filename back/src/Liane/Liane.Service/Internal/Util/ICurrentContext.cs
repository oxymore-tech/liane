using Liane.Api.Auth;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Util;

public interface ICurrentContext
{
  AuthUser CurrentUser();
  T? CurrentResource<T>() where T : class, IIdentity;
  ResourceAccessLevel CurrentResourceAccessLevel();
  bool AllowPastResourceCreation();
}