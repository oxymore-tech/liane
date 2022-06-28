using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.User;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Internal.Auth;

public class RequiresAdminAuthAttributeFilter : IAsyncAuthorizationFilter
{
    private static readonly JwtSecurityTokenHandler JwtTokenHandler = new();
    private readonly ILogger<RequiresAuthAttributeFilter> logger;

    public RequiresAdminAuthAttributeFilter(ILogger<RequiresAuthAttributeFilter> logger)
    {
        this.logger = logger;
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        try
        {
            var tokenString = TryExtractToken(context);

            if (tokenString == null)
            {
                throw new UnauthorizedAccessException();
            }
                
            var token = JwtTokenHandler.ReadJwtToken(tokenString);
            var isAdmin = false;
                
            foreach (var claim in token.Claims)
            {
                if (claim.Type.Equals("role"))
                {
                    isAdmin = claim.Value.Equals(AuthServiceImpl.AdminRole);
                }
            }

            if (!isAdmin)
            {
                throw new UnauthorizedAccessException();
            }

            logger.LogInformation("Admin access allowed to : " + tokenString);
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