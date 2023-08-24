using System.Diagnostics;
using System.Globalization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Internal.Debug;

public sealed class RequestLoggerFilter : IAsyncActionFilter, IOrderedFilter
{
  private readonly ILogger<RequestLoggerFilter> logger;

  public RequestLoggerFilter(ILogger<RequestLoggerFilter> logger)
  {
    this.logger = logger;
  }

  public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
  {
    if (!logger.IsEnabled(LogLevel.Information))
    {
      await next();
      return;
    }

    var request = context.HttpContext.Request;

    if (request.Path.ToString().EndsWith("/health"))
    {
      return;
    }

    var stopwatch = new Stopwatch();
    stopwatch.Start();
    logger.LogInformation("Request starting {Protocol} {Method} {Scheme}://{Host}{PathBase}{Path}{QueryString} - {ContentType} {ContentLength}",
      request.Protocol, request.Method, request.Scheme, request.Host, request.PathBase, request.Path, request.QueryString, request.ContentType ?? "-", request.ContentLength?.ToString(CultureInfo.InvariantCulture) ?? "-");
    await next();
    var response = context.HttpContext.Response;
    logger.LogInformation("Request finished {Protocol} {Method} {Scheme}://{Host}{PathBase}{Path}{QueryString} - {StatusCode} {ContentLength} {ContentType} {ElapsedMilliseconds}ms",
      request.Protocol, request.Method, request.Scheme, request.Host, request.PathBase, request.Path, request.QueryString,
      response.StatusCode, response.ContentLength?.ToString(CultureInfo.InvariantCulture) ?? "-", response.ContentType ?? "-", stopwatch.ElapsedMilliseconds);
  }

  public int Order => 0;
}