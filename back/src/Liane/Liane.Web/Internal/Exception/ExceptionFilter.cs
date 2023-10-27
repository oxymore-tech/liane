using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Internal.Exception;

public sealed class ExceptionFilter : IAsyncExceptionFilter, IOrderedFilter
{
  private readonly ILogger<ExceptionFilter> logger;

  public ExceptionFilter(ILogger<ExceptionFilter> logger)
  {
    this.logger = logger;
  }

  public Task OnExceptionAsync(ExceptionContext context)
  {
    var objectResult = HttpExceptionMapping.Map(context.Exception, context.ModelState, logger);
    if (objectResult == null)
    {
      context.Result = new ObjectResult(context.Exception) { StatusCode = 500 };
      return Task.CompletedTask;
    }

    context.Result = objectResult;
    context.ExceptionHandled = true;
    return Task.CompletedTask;
  }

  public int Order => -6;
}