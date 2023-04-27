using System.Threading.Tasks;
using Liane.Api.Event;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Liane.Web.Binder;

public sealed class PayloadTypeBinder : IModelBinder
{
  public Task BindModelAsync(ModelBindingContext bindingContext)
  {
    bindingContext.Result = ModelBindingResult.Success(ParseFromQuery(bindingContext.ValueProvider));
    return Task.CompletedTask;
  }

  private static PayloadType? ParseFromQuery(IValueProvider valueProvider)
  {
    var type = valueProvider.GetValue("type").FirstValue;

    return type is null ? null : PayloadType.FromType(type);
  }
}