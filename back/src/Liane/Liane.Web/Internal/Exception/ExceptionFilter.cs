using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Liane.Web.Internal.Exception;

public sealed class ExceptionFilter : IAsyncExceptionFilter, IOrderedFilter
{
  public Task OnExceptionAsync(ExceptionContext context)
  {
    var objectResult = HttpExceptionMapping.Map(context.Exception, context.ModelState);
    if (objectResult == null)
    {
      return Task.CompletedTask;
    }

    context.Result = objectResult;
    context.ExceptionHandled = true;
    return Task.CompletedTask;
  }

  public int Order => 1;
}