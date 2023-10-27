using System;
using NodaTime;
using NodaTime.Text;

namespace Liane.Service.Internal.Util;

public static class DateUtils
{
  
  public static bool IsDaylightSavingsTime(this ZonedDateTime d)
  {
    var instant = d.ToInstant();
    var zoneInterval = d.Zone.GetZoneInterval(instant);
    return zoneInterval.Savings != Offset.Zero;
  }
  
  
  public static DateTime HandleDaylightSavingsTime(DateTime createdAt, DateTime target, string zone = "Europe/Paris")
  {
    var parisTz = DateTimeZoneProviders.Tzdb[zone];
    var localCreatedAt = InstantPattern.ExtendedIso.Parse(createdAt.ToString("o")).Value.InZone(parisTz);
    var localTarget = InstantPattern.ExtendedIso.Parse(target.ToString("o")).Value.InZone(parisTz);

    if (localCreatedAt.IsDaylightSavingTime() && !localTarget.IsDaylightSavingTime())
    {
      return target.AddHours(1);
    }

    if (!localCreatedAt.IsDaylightSavingTime() && localTarget.IsDaylightSavingTime())
    {
      return target.AddHours(-1);
    }

    return target;
  }
}