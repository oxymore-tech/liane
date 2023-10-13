using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Liane.Web.Internal.Exception;

public sealed class ExceptionFilter : IAsyncExceptionFilter, IOrderedFilter
{
  public Task OnExceptionAsync(ExceptionContext context)
  {
    context.Result = HttpExceptionMapping.Map(context.Exception, context.ModelState);
    context.ExceptionHandled = true;
    return Task.CompletedTask;
  }

  public int Order => 1;
}