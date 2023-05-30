using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Util.Pagination;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Liane.Web.Binder;
/*
public sealed class LianePaginationModelBinder : PaginationModelBinder
{
  public new Task BindModelAsync(ModelBindingContext bindingContext)
  {
    var pagination = base.BindModelAsync(bindingContext);
    bindingContext.Result = 
    return Task.CompletedTask;
  }

}*/