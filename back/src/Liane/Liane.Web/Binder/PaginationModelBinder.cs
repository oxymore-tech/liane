using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Util.Pagination;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Liane.Web.Binder;

public sealed class PaginationModelBinder : IModelBinder
{
  public Task BindModelAsync(ModelBindingContext bindingContext)
  {
    bindingContext.Result = ModelBindingResult.Success(ParseFromQuery(bindingContext.HttpContext));
    return Task.CompletedTask;
  }

  private static Pagination<DatetimeCursor> ParseFromQuery(HttpContext httpContext)
  {
    var limit = httpContext.Request.Query["limit"]
      .Select(int.Parse)
      .Cast<int?>()
      .FirstOrDefault() ?? 15;
    var cursor = httpContext.Request.Query["cursor"]
      .Select(DatetimeCursor.Parse)
      .FirstOrDefault();
    return new Pagination<DatetimeCursor>(cursor, limit);
  }
}