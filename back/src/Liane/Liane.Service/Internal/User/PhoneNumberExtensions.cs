namespace Liane.Service.Internal.User;

public static class PhoneNumberExtensions
{
  public static string ToPhoneNumber(this string phone)
  {
    var trim = phone.Trim();

    if (trim.StartsWith("0"))
    {
      trim = $"+33{trim[1..]}";
    }

    return trim;
  }
}