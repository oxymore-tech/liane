using System;
using System.Collections.Generic;
using System.Linq;
using Liane.Api.Trip;
using NUnit.Framework;

namespace Liane.Test.Internal.Trip;

public class LianeRecurrenceTest
{
  [Test]
  public void ShouldEnumerateActiveDays()
  {
    var days = new HashSet<DayOfWeek> { DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Saturday };
    var recurrence = DayOfWeekFlagUtils.Create(days);
    CollectionAssert.AreEquivalent(recurrence.GetNextActiveDays(), days);
  }

  [Test]
  public void ShouldEnumerateNextDates()
  {
    var days = new HashSet<DayOfWeek> { DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Saturday };
    var recurrence = DayOfWeekFlagUtils.Create(days);
    var now = DateTime.UtcNow;
    var activeDates = new List<DateTime>();
    for (var day = 1; day <= 7; day++)
    {
      var newdate = now.AddDays(day);
      if (days.Contains(newdate.DayOfWeek)) activeDates.Add(newdate);
    }

    CollectionAssert.AreEquivalent(
      activeDates.Select(d => d.ToShortDateString() + d.ToShortTimeString()),
      recurrence.GetNextActiveDates(now, now.AddDays(7)).Select(d => d.ToShortDateString() + d.ToShortTimeString())
    );
  }
}