using System;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;

namespace Liane.Web.Binder;

public sealed class BindersProvider : IModelBinderProvider
{
  public IModelBinder? GetBinder(ModelBinderProviderContext context)
  {
    if (context == null)
    {
      throw new ArgumentNullException(nameof(context));
    }

    if (context.Metadata.ModelType == typeof(Pagination))
    {
      return new BinderTypeModelBinder(typeof(PaginationModelBinder));
    }

    if (context.Metadata.ModelType == typeof(PayloadType))
    {
      return new BinderTypeModelBinder(typeof(PayloadTypeBinder));
    }

    return null;
  }
}