using System.Net;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Liane.Web.Internal.Auth;

public sealed class RequiresAdminRoleFilter : IAsyncAuthorizationFilter
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
            context.Result = new ObjectResult("Forbidden") { StatusCode = (int)HttpStatusCode.Forbidden };
        }

        return Task.CompletedTask;
    }
}