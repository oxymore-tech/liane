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

  private static Pagination ParseFromQuery(HttpContext httpContext)
  {
    var limit = httpContext.Request.Query["limit"]
      .Where(s => s is not null)
      .Cast<string>()
      .Select(int.Parse)
      .Cast<int?>()
      .FirstOrDefault() ?? 15;
    var sortAsc = httpContext.Request.Query["asc"]
      .Where(s => s is not null)
      .Cast<string>()
      .Select(bool.Parse)
      .FirstOrDefault();
    var cursor = httpContext.Request.Query["cursor"]
      .Where(s => s is not null)
      .Cast<string>()
      .Select(Cursor.Parse)
      .FirstOrDefault();
    return new Pagination(cursor, limit, sortAsc);
  }
}