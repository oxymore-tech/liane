using System.Linq;
using System.Security.Claims;
using Liane.Api.Auth;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.User;
using Microsoft.AspNetCore.Http;

namespace Liane.Service.Internal.Util;

public sealed class CurrentContextImpl : ICurrentContext
{
  internal const string CurrentResourceName = nameof(CurrentResource);
  internal const string CurrentResourceAccessLevelName = nameof(CurrentResourceAccessLevelName);

  private readonly IHttpContextAccessor httpContextAccessor;

  public CurrentContextImpl(IHttpContextAccessor httpContextAccessor)
  {
    this.httpContextAccessor = httpContextAccessor;
  }

  public T? CurrentResource<T>() where T : class, IIdentity
  {
    var value = httpContextAccessor.HttpContext?.Items[CurrentResourceName];
    if (value is T validValue)
    {
      return validValue;
    }

    return null;
  }

  public ResourceAccessLevel CurrentResourceAccessLevel()
  {
    var value = httpContextAccessor.HttpContext?.Items[CurrentResourceAccessLevelName];
    if (value is ResourceAccessLevel validValue)
    {
      return validValue;
    }

    return ResourceAccessLevel.Any;
  }

  public bool AllowPastResourceCreation()
  {
    return false;
  }

  public AuthUser CurrentUser()
  {
    if (httpContextAccessor.HttpContext == null)
    {
      throw new ForbiddenException();
    }

    var userId = httpContextAccessor.HttpContext.User.Identity?.Name;

    if (userId == null)
    {
      throw new ForbiddenException();
    }

    var isAdmin = httpContextAccessor.HttpContext.User.Claims.Any(c => c is { Type: ClaimTypes.Role, Value: AuthServiceImpl.AdminRole });

    return new AuthUser(userId, isAdmin);
  }
}