using System;

namespace Liane.Service.Internal.Util;

public static class TimeUtils
{
  private static readonly TimeZoneInfo FranceTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Paris");

  public static DateTime NowInFrance()
  {
    var utcNow = DateTime.UtcNow;
    return DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(utcNow, FranceTimeZone), DateTimeKind.Local);
  }
}