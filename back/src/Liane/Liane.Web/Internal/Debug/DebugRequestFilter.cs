using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Internal.Debug;

public sealed class DebugRequestFilter : IAsyncAuthorizationFilter
{
  private readonly ILogger<DebugRequestFilter> logger;

  public DebugRequestFilter(ILogger<DebugRequestFilter> logger)
  {
    this.logger = logger;
  }

  public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
  {
    if (logger.IsEnabled(LogLevel.Debug))
    {
      context.HttpContext.Request.EnableBuffering();
      using var reader = new StreamReader(context.HttpContext.Request.Body, Encoding.UTF8, true, 1024, true);
      var body = await reader.ReadToEndAsync();
      context.HttpContext.Request.Body.Position = 0;
      if (body.Length > 0)
      {
        logger.LogDebug("Body debug {Path}\n{body}", context.HttpContext.Request.Path, body);
      }
    }
  }
}