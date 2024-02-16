using System;
using System.Collections.Generic;
using System.Linq;

namespace Liane.Api.Trip;

public readonly record struct DayOfTheWeekFlag(string FlagValue)
{
  public static implicit operator string(DayOfTheWeekFlag flag) => flag.FlagValue;

  public bool IsNever => FlagValue.All(c => c == '0');
  public static DayOfTheWeekFlag All => new("1111111");

  public override string ToString()
  {
    return this;
  }

  public IEnumerable<DayOfWeek> GetNextActiveDays(DayOfWeek start = DayOfWeek.Monday)
  {
    for (var day = 1; day <= 7; day++)
    {
      var flag = FlagValue[Mod(day + (int)start - 1, 7)];
      if (flag == '1')
      {
        yield return (DayOfWeek)Mod((int)start + day, 7);
      }
    }
  }

  public IEnumerable<DateTime> GetNextActiveDates(DateTime fromDate, DateTime maxDate)
  {
    var start = fromDate.DayOfWeek;
    var dayCount = (maxDate - fromDate).Days + 1;
    for (var day = 1; day <= dayCount; day++)
    {
      if (fromDate.Date.AddDays(day) > maxDate.Date)
      {
        break;
      }

      var flag = FlagValue[Mod(day + (int)start - 1, 7)];
      if (flag == '1')
      {
        yield return fromDate.AddDays(day);
      }
    }
  }

  public static DayOfTheWeekFlag Create(HashSet<DayOfWeek> days)
  {
    var flag = Enumerable.Repeat('0', 7).ToArray();
    foreach (var d in days)
    {
      var index = Mod((int)d - 1, 7);
      flag[index] = '1';
    }

    return new DayOfTheWeekFlag { FlagValue = new string(flag) };
  }

  private static int Mod(int x, int m)
  {
    return (x % m + m) % m;
  }

  public static int IndexOf(DayOfWeek day)
  {
    return Mod((int)day - 1, 7);
  }
}