using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Util.Exception;

public sealed class ValidationException : System.Exception
{
  public ValidationException(string field, ValidationMessage message, object? value = null)
  {
    var builder = ImmutableDictionary.CreateBuilder<string, string>();
    var valueSuffix = value == null ? "" : $":{value}";
    builder.Add(ToCamelCase(field), $"{message.Value}{valueSuffix}");
    Errors = builder.ToImmutable();
    Message = string.Join(", ", Errors.Select(e => $"{e.Key}: {e.Value}"));
  }

  public IImmutableDictionary<string, string> Errors { get; }

  public override string Message { get; }

  private static string ToCamelCase(string field)
  {
    return char.ToLowerInvariant(field[0]) + field.Substring(1);
  }
}

public sealed class ValidationMessage
{
  public readonly string Value;

  private ValidationMessage(string value)
  {
    Value = value;
  }

  public static ValidationMessage MalFormed => new("validation.malFormed");
}