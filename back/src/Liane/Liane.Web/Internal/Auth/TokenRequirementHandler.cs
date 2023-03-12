using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Internal.Auth;

public sealed class TokenRequirementHandler : AuthorizationHandler<TokenRequirement>
{
    private readonly IHttpContextAccessor httpContextAccessor;
    private readonly IAuthService authService;
    private readonly ILogger<TokenRequirementHandler> logger;

    public TokenRequirementHandler(ILogger<TokenRequirementHandler> logger, IHttpContextAccessor httpContextAccessor, IAuthService authService)
    {
        this.logger = logger;
        this.httpContextAccessor = httpContextAccessor;
        this.authService = authService;
    }
    
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, TokenRequirement requirement)
    {
        var httpContext = httpContextAccessor.HttpContext!;

        try
        {
            var token = TryExtractToken(httpContext);

            if (string.IsNullOrWhiteSpace(token))
            {
              context.Fail();
            }
            else
            {
              httpContext.User = authService.IsTokenValid(token);
              context.Succeed(requirement);
            }

        }
        catch (System.Exception e)
        {
            var referer = httpContext.Request.Headers["Referer"].FirstOrDefault();
            var message = e.Message;
            if (referer == null)
            {
                logger.LogWarning("Somebody has sent an invalid token : {message}", message);
            }
            else
            {
                logger.LogWarning("'{referer}' has sent an invalid token : {message}", referer, message);
            }

            context.Fail();
        }
        
        return Task.CompletedTask;
    }
    
    private static string? TryExtractToken(HttpContext httpContext)
    {
        // On negotiation
        var requestHeader = httpContext.Request.Headers["Authorization"].FirstOrDefault();
        if (requestHeader != null)
        {
            return ParseBearer(requestHeader);
        }
        
        // On connection establishment
        return httpContext.Request.Query["access_token"];
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