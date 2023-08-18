using System;
using System.Collections.Generic;
using System.Linq;

namespace Liane.Api.Trip;

public struct DayOfTheWeekFlag
{
  public string FlagValue { get; init; }
  public static implicit operator string(DayOfTheWeekFlag @flag) => @flag.FlagValue;

  public bool IsNever => FlagValue.All(c => c == '0');
  public override string ToString()
  {
    return this;
  }

  public IEnumerable<DayOfWeek> GetNextActiveDays(DayOfWeek start = DayOfWeek.Monday)
  {
    for (var day = 1; day <= 7; day++)
    {
      var flag = FlagValue[(day + (int)start - 1) % 7];
      if (flag == '1')
      {
        yield return (DayOfWeek)(((int)start + day ) % 7);
      }
    }
  }

  public IEnumerable<DateTime> GetNextActiveDates(DateTime fromDate, DateTime maxDate)
  {
    var start = fromDate.DayOfWeek;
    for (var day = 1; day <= 7; day++)
    {
      if (fromDate.Date.AddDays(day) > maxDate.Date)
      {
        break;
      }
      var flag = FlagValue[(day + (int)start - 1) % 7];
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
      flag[(int)d - 1] = '1';
    }
    return new DayOfTheWeekFlag { FlagValue = new string(flag) };
  }

}
