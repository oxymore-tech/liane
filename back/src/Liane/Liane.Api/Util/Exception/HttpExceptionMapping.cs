using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;

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

  public static IActionResult? Map(System.Exception exception, ModelStateDictionary? modelState = null, ILogger? logger = null)
  {
    switch (exception)
    {
      case TaskCanceledException e:
      {
        var validationErrorResponse = new Dictionary<string, object> { ["title"] = exception.Message };

        logger?.LogWarning(e.Message);
        return new BadRequestObjectResult(validationErrorResponse);
      }

      case ArgumentException e:
      {
        var validationErrorResponse = new Dictionary<string, object> { ["title"] = exception.Message };

        logger?.LogWarning(e.Message, e);
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

        logger?.LogWarning(e.Message, e);
        return new BadRequestObjectResult(validationErrorResponse);
      }

      case ResourceNotFoundException e:
        logger?.LogWarning(e.Message, e);
        return new NotFoundObjectResult(e.Message);

      case UnauthorizedAccessException _:
        return new UnauthorizedResult();

      case ForbiddenException e:
        return Result(e.Message, HttpStatusCode.Forbidden);

      case ExpectationFailedException e: 
      {
        logger?.LogWarning(e.Message, e);
        return Result(e.Message, HttpStatusCode.ExpectationFailed);
      }
        
    }

    return null;
  }

  private static ObjectResult Result(string message, HttpStatusCode code)
  {
    return new ObjectResult(message) { StatusCode = (int)code };
  }
}