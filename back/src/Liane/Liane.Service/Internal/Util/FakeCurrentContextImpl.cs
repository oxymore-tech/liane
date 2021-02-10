using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Microsoft.AspNetCore.Http;

namespace Liane.Service.Internal.Util
{
    public sealed class FakeCurrentContextImpl : ICurrentContext
    {
        private readonly IHttpContextAccessor httpContextAccessor;

        public FakeCurrentContextImpl(IHttpContextAccessor httpContextAccessor)
        {
            this.httpContextAccessor = httpContextAccessor;
        }

        public string CurrentUser()
        {
            if (httpContextAccessor.HttpContext == null)
            {
                throw new ForbiddenException();
            }

            if (httpContextAccessor.HttpContext.Request.Headers.TryGetValue("Authorization", out var auth))
            {
                return auth;
            }

            throw new ForbiddenException();
        }
    }
}