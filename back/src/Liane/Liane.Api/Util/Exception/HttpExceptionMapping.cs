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
    // ReSharper disable once SwitchStatementMissingSomeCases
    switch (code)
    {
      case HttpStatusCode.NotFound:
        return new ResourceNotFoundException(responseContent);
      case HttpStatusCode.Unauthorized:
        return new UnauthorizedAccessException(responseContent);
      case HttpStatusCode.Forbidden:
        return new ForbiddenException();
      case HttpStatusCode.ExpectationFailed:
        return new ExpectationFailedException(responseContent);
    }

    return new HttpRequestException($"{code} : {responseContent}");
  }

  public static IActionResult? Map(System.Exception exception, ModelStateDictionary? modelState = null, ILogger? logger = null)
  {
    switch (exception)
    {
      case TaskCanceledException e:
        logger?.LogInformation("Request canceled");
        return new BadRequestObjectResult("Request canceled");

      case ValidationException e:
      {
        var errors = new ModelStateDictionary(modelState ?? new ModelStateDictionary());
        foreach (var (field, message) in e.Errors) errors.AddModelError(field, message);

        var validationErrorResponse = new Dictionary<string, object> { ["errors"] = new SerializableError(errors), ["title"] = "One or more validation errors occurred." };
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