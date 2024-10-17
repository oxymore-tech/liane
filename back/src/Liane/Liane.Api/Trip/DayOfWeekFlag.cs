using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Liane.Api.Trip;

public readonly struct DayOfWeekFlag : IEquatable<DayOfWeekFlag>, IComparable<DayOfWeekFlag>
{
  private DayOfWeekFlag(uint value)
  {
    this.value = value;
  }

  private static readonly DayOfWeek[] AllDays =
  [
    DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday
  ];

  private readonly uint value;
  public static DayOfWeekFlag Empty => new(0);
  public static DayOfWeekFlag Monday => new(1 << 1);
  public static DayOfWeekFlag Tuesday => new(1 << 2);
  public static DayOfWeekFlag Wednesday => new(1 << 3);
  public static DayOfWeekFlag Thursday => new(1 << 4);
  public static DayOfWeekFlag Friday => new(1 << 5);
  public static DayOfWeekFlag Saturday => new(1 << 6);
  public static DayOfWeekFlag Sunday => new(1 << 7);
  public static DayOfWeekFlag All => Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday;

  public static DayOfWeekFlag operator |(DayOfWeekFlag a, DayOfWeekFlag b) => new(a.value | b.value);

  public static implicit operator DayOfWeekFlag(DayOfWeek dayOfWeek) => dayOfWeek switch
  {
    DayOfWeek.Sunday => Sunday,
    DayOfWeek.Monday => Monday,
    DayOfWeek.Tuesday => Tuesday,
    DayOfWeek.Wednesday => Wednesday,
    DayOfWeek.Thursday => Thursday,
    DayOfWeek.Friday => Friday,
    DayOfWeek.Saturday => Saturday,
    _ => throw new ArgumentOutOfRangeException(nameof(dayOfWeek), dayOfWeek, null)
  };

  public bool HasFlag(DayOfWeekFlag flag) => (value & flag.value) == flag.value;

  public bool IsEmpty() => value == 0;

  public override string ToString()
    => ToString('0');

  public string ToString(char empty)
  {
    var flag = Enumerable.Repeat(empty, 7).ToArray();
    for (var i = 0; i < AllDays.Length; i++)
    {
      if (HasFlag(AllDays[i]))
      {
        flag[i] = '1';
      }
    }

    return new string(flag);
  }

  public static DayOfWeekFlag Create(params DayOfWeek[] days)
  {
    var flag = Empty;
    foreach (var d in days.Distinct())
    {
      flag |= d;
    }

    return flag;
  }

  public IEnumerable<DayOfWeek> GetNextActiveDays(DayOfWeek start = DayOfWeek.Monday)
  {
    var startIndex = Array.IndexOf(AllDays, start);
    for (var i = startIndex; i < AllDays.Length; i++)
    {
      var dayOfWeek = AllDays[i];
      if (HasFlag(dayOfWeek))
      {
        yield return dayOfWeek;
      }
    }
  }

  public IEnumerable<DateTime> GetNextActiveDates(DateTime fromDate, DateTime maxDate)
  {
    var dayCount = (maxDate - fromDate).Days + 1;
    for (var day = 1; day <= dayCount; day++)
    {
      var fromPlusDays = fromDate.Date.AddDays(day);
      if (fromPlusDays > maxDate.Date)
      {
        break;
      }

      if (HasFlag(fromPlusDays.DayOfWeek))
      {
        yield return fromDate.AddDays(day);
      }
    }
  }

  public static DayOfWeekFlag Parse(BitArray value)
  {
    return AllDays.TakeWhile((_, i) => i < value.Length)
      .Where((_, i) => value[i])
      .Aggregate(Empty, (current, t) => current | t);
  }

  public static DayOfWeekFlag Parse(string value)
  {
    return AllDays.TakeWhile((_, i) => i < value.Length)
      .Where((_, i) => value[i] == '1')
      .Aggregate(Empty, (current, t) => current | t);
  }

  public bool Equals(DayOfWeekFlag other)
  {
    return value == other.value;
  }

  public override bool Equals(object? obj)
  {
    return obj is DayOfWeekFlag other && Equals(other);
  }

  public override int GetHashCode()
  {
    return (int)value;
  }

  public int CompareTo(DayOfWeekFlag other)
  {
    return (int)value - (int)other.value;
  }
}