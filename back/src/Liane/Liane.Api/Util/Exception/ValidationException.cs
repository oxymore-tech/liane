using System.Collections.Immutable;
using Liane.Api.Trip;

namespace Liane.Api.Util.Exception;

public sealed class ValidationException : System.Exception
{
  public ValidationException(ValidationMessage message) : this(message.Value, ImmutableDictionary<string, ValidationMessage>.Empty)
  {
  }

  public ValidationException(string field, ValidationMessage message) : this($"{message.Value} field:{field}", Format(field, message))
  {
  }

  public ValidationException(IImmutableDictionary<string, ValidationMessage> errors) : this(null, errors)
  {
  }

  private ValidationException(string? message, IImmutableDictionary<string, ValidationMessage> errors)
  {
    Errors = errors.ToImmutableDictionary(e => e.Key.Uncapitalize(), e => e.Value.Value);
    Message = message ?? "One or more validation errors occurred.";
  }

  private static ImmutableDictionary<string, ValidationMessage> Format(string field, ValidationMessage message)
  {
    var builder = ImmutableDictionary.CreateBuilder<string, ValidationMessage>();
    builder.Add(field, message);
    return builder.ToImmutable();
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

  public static ValidationMessage Required => new("required");
  public static ValidationMessage WrongFormat => new("wrong_format");
  public static ValidationMessage UnknownValue => new("unknown_value");

  public static ValidationMessage TooShort(int min) => new($"too_short min:{min}");

  public static ValidationMessage AlreadyMember => new("already_member");

  public static ValidationMessage LianeStateInvalid(TripStatus state) => new($"liane_state_invalid state:{state}");
}