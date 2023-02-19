using System;
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
      .Select(int.Parse)
      .Cast<int?>()
      .FirstOrDefault() ?? 15;
    var sortAsc = httpContext.Request.Query["asc"]
      .Select(bool.Parse)
      .FirstOrDefault();
    var cursor = httpContext.Request.Query["cursor"]
      .Select(Cursor.Parse)
      .FirstOrDefault();
    return new Pagination(cursor, limit, sortAsc);
  }
}