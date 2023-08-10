using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Util.Exception;

public sealed class ValidationException : System.Exception
{
  public ValidationException(string field, ValidationMessage message) : this(Format(field, message))
  {
  }

  private static ImmutableDictionary<string, ValidationMessage> Format(string field, ValidationMessage message)
  {
    var builder = ImmutableDictionary.CreateBuilder<string, ValidationMessage>();
    builder.Add(field, message);
    return builder.ToImmutable();
  }

  public ValidationException(IImmutableDictionary<string, ValidationMessage> errors)
  {
    Errors = errors.ToImmutableDictionary(e => e.Key.Uncapitalize(), e => e.Value.Value);
    Message = string.Join(", ", errors.Select(e => $"{e.Key}: {e.Value}"));
  }

  public IImmutableDictionary<string, string> Errors { get; }

  public override string Message { get; }
}

public sealed class ValidationMessage
{
  public readonly string Value;

  private ValidationMessage(string value)
  {
    Value = value;
  }

  public static ValidationMessage IsRequired => new("validation.required");
  public static ValidationMessage HasWrongFormat => new("validation.wrong-format");
}