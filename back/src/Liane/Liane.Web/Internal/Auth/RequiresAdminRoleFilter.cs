using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Liane.Web.Internal.Auth;

public class RequiresAdminRoleFilter : IAsyncAuthorizationFilter
{
    private readonly ICurrentContext currentContext;

    public RequiresAdminRoleFilter(ICurrentContext currentContext)
    {
        this.currentContext = currentContext;
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (!currentContext.CurrentUser().IsAdmin)
        {
            throw new ForbiddenException();
        }

        return Task.CompletedTask;
    }
}