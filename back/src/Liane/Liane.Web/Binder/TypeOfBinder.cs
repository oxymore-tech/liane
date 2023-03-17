using System;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Liane.Web.Binder;

public sealed class TypeOfBinder : IModelBinder
{
  public Task BindModelAsync(ModelBindingContext bindingContext)
  {
    bindingContext.Result = ModelBindingResult.Success(ParseFromQuery(bindingContext.ModelType, bindingContext.ValueProvider));
    return Task.CompletedTask;
  }

  private static object? ParseFromQuery(Type modelType, IValueProvider valueProvider)
  {
    var itemType = modelType.GetGenericArguments()[0];

    var type = valueProvider.GetValue("type").FirstValue;

    if (type is null)
    {
      return null;
    }

    var matchType = itemType.GetNestedTypes()
      .Where(t => t.IsAssignableTo(itemType))
      .FirstOrDefault(t => t.Name.NormalizeToCamelCase() == type);

    if (matchType is null)
    {
      throw new ValidationException("type", ValidationMessage.InvalidToken);
    }

    return typeof(TypeOf<>)
      .MakeGenericType(matchType)
      .GetConstructors()[0]
      .Invoke(Array.Empty<object?>());
  }
}