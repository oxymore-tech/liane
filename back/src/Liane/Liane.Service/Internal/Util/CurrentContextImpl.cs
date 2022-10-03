using System.Linq;
using System.Security.Claims;
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
        var phone = httpContextAccessor.HttpContext.User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.MobilePhone)?.Value;

        if (userId == null || phone == null)
        {
            throw new ForbiddenException();
        }

        var isAdmin = httpContextAccessor.HttpContext.User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == AuthServiceImpl.AdminRole);

        return new AuthUser(userId, phone, isAdmin);
    }
}