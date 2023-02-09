using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Web.Internal.AccessLevel;

namespace Liane.Service.Internal.Util;

public interface ICurrentContext
{
  const string CurrentResourceName = nameof(CurrentResource); 
  const string CurrentResourceAccessLevelName = nameof(CurrentResourceAccessLevelName);
   AuthUser CurrentUser();
   T? CurrentResource<T>() where T : class, IIdentity;
   ResourceAccessLevel CurrentResourceAccessLevel();

}