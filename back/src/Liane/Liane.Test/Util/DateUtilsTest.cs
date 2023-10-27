using System;
using Liane.Service.Internal.Util;
using NUnit.Framework;

namespace Liane.Test.Util;

public sealed class DateUtilsTest
{
  [Test]
  public void ShouldChangeTime()
  {
    var created = DateTime.Parse("2023-10-27T12:50:37.734+02:00").ToUniversalTime();
    var target = DateTime.Parse("2023-11-27T12:50:37.734+01:00").ToUniversalTime();

    var updatedTarget = DateUtils.HandleDaylightSavingsTime(created, target);
    
    Assert.AreEqual(60, (updatedTarget.ToUniversalTime() - target).TotalMinutes);
  }
}