using Twilio.Types;

namespace Liane.Service.Internal.User;

public static class PhoneNumberExtensions
{
  public static PhoneNumber ToPhoneNumber(this string phone)
  {
    var trim = phone.Trim();

    if (trim.StartsWith("0"))
    {
      trim = $"+33{trim[1..]}";
    }

    return new PhoneNumber(trim);
  }
}