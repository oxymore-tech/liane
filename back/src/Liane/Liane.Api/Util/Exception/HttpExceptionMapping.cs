using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Liane.Api.Util.Exception;

public static class HttpExceptionMapping
{
  public static System.Exception Map(HttpStatusCode? code, string responseContent)
  {
    return code switch
    {
      HttpStatusCode.NotFound => new ResourceNotFoundException(responseContent),
      HttpStatusCode.Unauthorized => new UnauthorizedAccessException(responseContent),
      HttpStatusCode.Forbidden => new ForbiddenException(),
      HttpStatusCode.ExpectationFailed => new ExpectationFailedException(responseContent),
      _ => new HttpRequestException($"{code} : {responseContent}")
    };
  }

  public static IActionResult? Map(System.Exception exception, ModelStateDictionary? modelState = null)
  {
    switch (exception)
    {
      case TaskCanceledException:
      case ArgumentException:
      {
        var validationErrorResponse = new Dictionary<string, object> { ["title"] = exception.Message };
        return new BadRequestObjectResult(validationErrorResponse);
      }

      case ValidationException e:
      {
        var errors = new ModelStateDictionary(modelState ?? new ModelStateDictionary());
        foreach (var (field, message) in e.Errors)
        {
          errors.AddModelError(field, message);
        }

        var validationErrorResponse = new Dictionary<string, object> { ["errors"] = new SerializableError(errors), ["title"] = exception.Message };
        return new BadRequestObjectResult(validationErrorResponse);
      }

      case ResourceNotFoundException e:
        return new NotFoundObjectResult(e.Message);

      case UnauthorizedAccessException _:
        return new UnauthorizedResult();

      case ForbiddenException e:
        return Result(e.Message, HttpStatusCode.Forbidden);

      case ExpectationFailedException e:
        return Result(e.Message, HttpStatusCode.ExpectationFailed);
    }

    return null;
  }

  private static ObjectResult Result(string message, HttpStatusCode code)
  {
    return new ObjectResult(message) { StatusCode = (int)code };
  }
}