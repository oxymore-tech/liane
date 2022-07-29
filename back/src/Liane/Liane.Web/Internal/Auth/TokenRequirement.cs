using Microsoft.AspNetCore.Authorization;

namespace Liane.Web.Internal.Auth;

public class TokenRequirement : IAuthorizationRequirement
{
    public TokenRequirement()
    {
    }
}