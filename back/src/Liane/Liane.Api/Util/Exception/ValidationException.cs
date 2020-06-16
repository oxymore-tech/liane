using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Util.Exception
{
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

        public static ValidationMessage IsRequired => new ValidationMessage("validation.required");
        public static ValidationMessage NotFound => new ValidationMessage("validation.notFound");
        public static ValidationMessage AlreadyExist => new ValidationMessage("validation.alreadyExist");
        public static ValidationMessage IsUsed => new ValidationMessage("validation.isUsed");

        public static ValidationMessage CannotDeleteAffectedRole =>
            new ValidationMessage("validation.cannotDeleteAffectedRole");

        public static ValidationMessage InvalidCharacterForTenant =>
            new ValidationMessage("validation.invalidCharacterForTenant");

        public static ValidationMessage InvalidCharacter => new ValidationMessage("validation.invalidCharacter");
        public static ValidationMessage InvalidUrl => new ValidationMessage("validation.invalidUrl");
        public static ValidationMessage InvalidEmail => new ValidationMessage("validation.invalidEmail");

        public static ValidationMessage CantSendInvitationEmailToRegisteredUser =>
            new ValidationMessage("validation.cantSendInvitationEmailToRegisteredUser");

        public static ValidationMessage InvalidRegisterToken =>
            new ValidationMessage("validation.invalidRegisterToken");

        public static ValidationMessage InvalidToken => new ValidationMessage("validation.invalidToken");

        public static ValidationMessage InvalidResetPasswordToken =>
            new ValidationMessage("validation.invalidResetPasswordToken");

        public static ValidationMessage InvalidValueForScope =>
            new ValidationMessage("validation.invalidValueForScope");

        public static ValidationMessage ErrorResettingPassword =>
            new ValidationMessage("validation.password.errorResettingPassword");

        public static ValidationMessage PasswordMinimumSize => new ValidationMessage("validation.password.minimumSize");
        public static ValidationMessage PasswordMaximumSize => new ValidationMessage("validation.password.maximumSize");
        public static ValidationMessage PasswordVisible => new ValidationMessage("validation.password.visible");
        public static ValidationMessage PasswordUpperCase => new ValidationMessage("validation.password.upperCase");
        public static ValidationMessage PasswordLowerCase => new ValidationMessage("validation.password.lowerCase");

        public static ValidationMessage PasswordSpecialCharacter =>
            new ValidationMessage("validation.password.specialCharacter");

        public static ValidationMessage MalFormed => new ValidationMessage("validation.malFormed");
        public static ValidationMessage NotAllowedOperation => new ValidationMessage("validation.notAllowedOperation");
        public static ValidationMessage NotValidClosingDate => new ValidationMessage("validation.notValidClosingDate");

        public static ValidationMessage ReferentialTypeCanNotBeChange =>
            new ValidationMessage("validation.referentialTypeCanNotBeChange");

        public static ValidationMessage CountryCanNotBeChange =>
            new ValidationMessage("validation.countryCanNotBeChange");

        public static ValidationMessage UnknownConfigurationField =>
            new ValidationMessage("validation.unknownConfigurationField");

        public static ValidationMessage IncompatibleRegion => new ValidationMessage("validation.incompatibleRegion");

        public static ValidationMessage UnauthorizedFormat =>
            new ValidationMessage("validation.document.unauthorizedFormat");

        public static ValidationMessage UnknownIssuer => new ValidationMessage("validation.document.unknownIssuer");
        public static ValidationMessage ShouldBeUserModel => new ValidationMessage("validation.shouldBeUserModel");
        public static ValidationMessage ShouldBeBaseModel => new ValidationMessage("validation.shouldBeBaseModel");

        public static ValidationMessage InvalidFieldValueType =>
            new ValidationMessage("validation.invalidFieldValueType");

        public static ValidationMessage CodeMustContainAlphanumericCharacters =>
            new ValidationMessage("validation.codeMustContainAlphanumericCharacters");

        public static ValidationMessage CantChangeDataGroup => new ValidationMessage("validation.cantChangeDataGroup");
        public static ValidationMessage CantShowHide => new ValidationMessage("validation.cantShowHide");
        public static ValidationMessage CantDelete => new ValidationMessage("validation.cantDelete");
        public static ValidationMessage CantBeCriteria => new ValidationMessage("validation.cantBeCriteria");
        public static ValidationMessage CantBeHistorized => new ValidationMessage("validation.cantBeHistorized");

        public static ValidationMessage MandatoryShouldBeInDefaultDataGroup =>
            new ValidationMessage("validation.mandatoryShouldBeInDefaultDataGroup");

        public static ValidationMessage CantChangeModel => new ValidationMessage("validation.cantChangeModel");
    }
}