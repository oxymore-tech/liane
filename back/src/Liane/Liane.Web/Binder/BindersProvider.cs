using System;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;

namespace Liane.Web.Binder;

public class BindersProvider : IModelBinderProvider
{
  public IModelBinder GetBinder(ModelBinderProviderContext context)
  {
    if (context == null)
    {
      throw new ArgumentNullException(nameof(context));
    }

    if (context.Metadata.ModelType == typeof(Pagination<DatetimeCursor>))
    {
      return new BinderTypeModelBinder(typeof(PaginationModelBinder));
    }

    return null;
  }
}