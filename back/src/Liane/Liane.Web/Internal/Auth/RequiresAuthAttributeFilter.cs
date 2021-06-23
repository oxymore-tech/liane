using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Internal.Auth
{
    public sealed class RequiresAuthAttributeFilter : IAsyncAuthorizationFilter
    {
        private readonly ILogger<RequiresAuthAttributeFilter> logger;
        private readonly IAuthService authService;

        public RequiresAuthAttributeFilter(ILogger<RequiresAuthAttributeFilter> logger, IAuthService authService)
        {
            this.logger = logger;
            this.authService = authService;
        }

        public Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            if (context.Filters.Any(metadata => metadata is DisableAuthAttribute))
            {
                return Task.CompletedTask;
            }

            try
            {
                var token = TryExtractToken(context);
                
                if (token == null)
                {
                    throw new UnauthorizedAccessException();
                }
                
                context.HttpContext.User = authService.IsTokenValid(token);
            }
            catch (System.Exception e)
            {
                var referer = context.HttpContext.Request.Headers["Referer"].FirstOrDefault();
                var message = e.Message;
                if (referer == null)
                {
                    logger.LogWarning("Somebody has sent an invalid token : {message}", message);
                }
                else
                {
                    logger.LogWarning("'{referer}' has sent an invalid token : {message}", referer, message);
                }

                var actionResult = HttpExceptionMapping.Map(e, context.ModelState);
                if (actionResult == null)
                {
                    throw;
                }

                context.Result = actionResult;
            }

            return Task.CompletedTask;
        }

        private static string? TryExtractToken(ActionContext context)
        {
            var requestHeader = context.HttpContext.Request.Headers["Authorization"].FirstOrDefault();
            if (requestHeader != null)
            {
                return ParseBearer(requestHeader);
            }

            var requestCookie = context.HttpContext.Request.Cookies["Authorization"];
            if (requestCookie != null)
            {
                return ParseBearer(requestCookie);
            }

            return context.HttpContext.Request.Query["ApiToken"];
        }

        private static string ParseBearer(string authorizationHeader)
        {
            var match = Regex.Match(authorizationHeader, @"Bearer[\s]*(.*)", RegexOptions.IgnoreCase);

            if (match.Success)
            {
                return match.Groups[1].Value;
            }

            throw new ArgumentException("Invalid Authorization header format. Use Bearer");
        }
    }
}