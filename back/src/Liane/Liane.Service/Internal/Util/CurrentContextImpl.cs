using System.Linq;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Service.Internal.User;
using Microsoft.AspNetCore.Http;

namespace Liane.Service.Internal.Util;

public sealed class CurrentContextImpl : ICurrentContext
{
    private readonly IHttpContextAccessor httpContextAccessor;

    public CurrentContextImpl(IHttpContextAccessor httpContextAccessor)
    {
        this.httpContextAccessor = httpContextAccessor;
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

        var isAdmin = httpContextAccessor.HttpContext.User.Claims.Any(e => e.Type.Equals("role") && e.Value == AuthServiceImpl.AdminRole);

        return new AuthUser(userId, "", isAdmin);
    }
}