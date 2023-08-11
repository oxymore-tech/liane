using System.Diagnostics;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using MongoDB.Driver.Core.Operations;

namespace Liane.Web.Internal.Debug;

public sealed class RequestLoggerFilter : IAsyncActionFilter
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
      request.Protocol, request.Method, request.Scheme, request.Host, request.PathBase, request.Path, request.QueryString, request.ContentType, request.ContentLength);
    await next();
    var response = context.HttpContext.Response;
    logger.LogInformation("Request finished {Protocol} {Method} {Scheme}://{Host}{PathBase}{Path}{QueryString} - {StatusCode} {ContentLength} {ContentType} {ElapsedMilliseconds}ms",
      request.Protocol, request.Method, request.Scheme, request.Host, request.PathBase, request.Path, request.QueryString,
      response.StatusCode, response.ContentLength, response.ContentType, stopwatch.ElapsedMilliseconds);
  }
}