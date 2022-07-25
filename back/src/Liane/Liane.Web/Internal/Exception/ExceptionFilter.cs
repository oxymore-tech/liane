using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Liane.Web.Internal.Exception;

public class ExceptionFilter : IAsyncExceptionFilter
{
    public Task OnExceptionAsync(ExceptionContext context)
    {
        var objectResult = HttpExceptionMapping.Map(context.Exception, context.ModelState);
        if (objectResult != null)
        {
            context.Result = objectResult;
            context.ExceptionHandled = true;
        }

        return Task.CompletedTask;
    }
}