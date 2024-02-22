using System;
using System.Collections.Generic;
using System.Linq;

namespace Liane.Api.Trip;

[Flags]
public enum DayOfWeekFlag
{
  None = 0,
  Monday = 1 << 0,
  Tuesday = 1 << 1,
  Wednesday = 1 << 2,
  Thursday = 1 << 3,
  Friday = 1 << 4,
  Saturday = 1 << 5,
  Sunday = 1 << 6,
  All = Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday
}

public static class DayOfWeekFlagUtils
{
  private static readonly DayOfWeekFlag[] All =
  [
    DayOfWeekFlag.Monday, DayOfWeekFlag.Tuesday, DayOfWeekFlag.Wednesday, DayOfWeekFlag.Thursday, DayOfWeekFlag.Friday, DayOfWeekFlag.Saturday, DayOfWeekFlag.Sunday
  ];

  private static readonly DayOfWeek[] AllDays =
  [
    DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday
  ];

  public static DayOfWeekFlag ToFlag(this DayOfWeek dayOfWeek)
  {
    return dayOfWeek switch
    {
      DayOfWeek.Sunday => DayOfWeekFlag.Sunday,
      DayOfWeek.Monday => DayOfWeekFlag.Monday,
      DayOfWeek.Tuesday => DayOfWeekFlag.Tuesday,
      DayOfWeek.Wednesday => DayOfWeekFlag.Wednesday,
      DayOfWeek.Thursday => DayOfWeekFlag.Thursday,
      DayOfWeek.Friday => DayOfWeekFlag.Friday,
      DayOfWeek.Saturday => DayOfWeekFlag.Saturday,
      _ => throw new ArgumentOutOfRangeException(nameof(dayOfWeek), dayOfWeek, null)
    };
  }

  public static DayOfWeekFlag Create(params DayOfWeek[] days)
  {
    var flag = DayOfWeekFlag.None;
    foreach (var d in days.Distinct())
    {
      flag |= d switch
      {
        DayOfWeek.Sunday => DayOfWeekFlag.Sunday,
        DayOfWeek.Monday => DayOfWeekFlag.Monday,
        DayOfWeek.Tuesday => DayOfWeekFlag.Tuesday,
        DayOfWeek.Wednesday => DayOfWeekFlag.Wednesday,
        DayOfWeek.Thursday => DayOfWeekFlag.Thursday,
        DayOfWeek.Friday => DayOfWeekFlag.Friday,
        DayOfWeek.Saturday => DayOfWeekFlag.Saturday,
        _ => throw new ArgumentOutOfRangeException(nameof(d), d, null)
      };
    }

    return flag;
  }

  public static IEnumerable<DayOfWeek> GetNextActiveDays(this DayOfWeekFlag flag, DayOfWeek start = DayOfWeek.Monday)
  {
    var startIndex = Array.IndexOf(AllDays, start);
    for (var i = startIndex; i < AllDays.Length; i++)
    {
      var dayOfWeek = AllDays[i];
      if (flag.HasFlag(dayOfWeek.ToFlag()))
      {
        yield return dayOfWeek;
      }
    }
  }

  public static IEnumerable<DateTime> GetNextActiveDates(this DayOfWeekFlag flag, DateTime fromDate, DateTime maxDate)
  {
    var dayCount = (maxDate - fromDate).Days + 1;
    for (var day = 1; day <= dayCount; day++)
    {
      var fromPlusDays = fromDate.Date.AddDays(day);
      if (fromPlusDays > maxDate.Date)
      {
        break;
      }

      if (flag.HasFlag(fromPlusDays.DayOfWeek.ToFlag()))
      {
        yield return fromDate.AddDays(day);
      }
    }
  }

  public static string PrintToString(this DayOfWeekFlag value, char empty = '0')
  {
    var flag = Enumerable.Repeat(empty, 7).ToArray();
    for (var i = 0; i < All.Length; i++)
    {
      if (value.HasFlag(All[i]))
      {
        flag[i] = '1';
      }
    }

    return new string(flag);
  }

  public static DayOfWeekFlag FromString(string value)
  {
    return All.TakeWhile((_, i) => i < value.Length)
      .Where((_, i) => value[i] == '1')
      .Aggregate(DayOfWeekFlag.None, (current, t) => current | t);
  }
}