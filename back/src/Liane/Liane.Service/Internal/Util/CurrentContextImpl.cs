using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Microsoft.AspNetCore.Http;

namespace Liane.Service.Internal.Util
{
    public sealed class CurrentContextImpl : ICurrentContext
    {
        private readonly IHttpContextAccessor httpContextAccessor;

        public CurrentContextImpl(IHttpContextAccessor httpContextAccessor)
        {
            this.httpContextAccessor = httpContextAccessor;
        }

        public string CurrentUser()
        {
            if (httpContextAccessor.HttpContext == null)
            {
                throw new ForbiddenException();
            }

            var claimsPrincipal = httpContextAccessor.HttpContext.User;

            if (claimsPrincipal == null)
            {
                throw new ForbiddenException();
            }

            return claimsPrincipal.Identity!.Name!;
        }
    }
}