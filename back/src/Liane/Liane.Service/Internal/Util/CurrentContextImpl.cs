using System.Linq;
using System.Security.Claims;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.User;
using Liane.Web.Internal.AccessLevel;
using Microsoft.AspNetCore.Http;

namespace Liane.Service.Internal.Util;

public sealed class CurrentContextImpl : ICurrentContext
{
    private readonly IHttpContextAccessor httpContextAccessor;

    public CurrentContextImpl(IHttpContextAccessor httpContextAccessor)
    {
        this.httpContextAccessor = httpContextAccessor;
    }

    public T? CurrentResource<T>() where T : class, IIdentity
    {
      if (httpContextAccessor.HttpContext != null)
      {
        var value = this.httpContextAccessor.HttpContext?.Items[ICurrentContext.CurrentResourceName];
        if (value is T validValue)
        {
          return validValue;
        }
      }

      return null;
    }

    public ResourceAccessLevel CurrentResourceAccessLevel()
    {
      if (httpContextAccessor.HttpContext != null)
      {
        var value = this.httpContextAccessor.HttpContext?.Items[ICurrentContext.CurrentResourceAccessLevelName];
        if (value is ResourceAccessLevel validValue)
        {
          return validValue;
        }
      }
      return ResourceAccessLevel.Any;
    }

    public AuthUser CurrentUser() //TODO check here that user really exists in Db ?
    {
        if (httpContextAccessor.HttpContext == null)
        {
            throw new ForbiddenException();
        }

        var userId = httpContextAccessor.HttpContext.User.Identity?.Name;
        var phone = httpContextAccessor.HttpContext.User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.MobilePhone)?.Value;

        if (userId == null || phone == null)
        {
            throw new ForbiddenException();
        }

        var isAdmin = httpContextAccessor.HttpContext.User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == AuthServiceImpl.AdminRole);

        return new AuthUser(userId, phone, isAdmin);
    }
}