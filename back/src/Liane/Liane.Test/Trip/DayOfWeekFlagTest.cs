using Liane.Api.Trip;
using NUnit.Framework;

namespace Liane.Test.Trip;

[TestFixture]
public sealed class DayOfWeekFlagTest
{
  [Test]
  public void ShouldPrintMondayToString()
  {
    var actual = DayOfWeekFlag.Monday;
    Assert.AreEqual("1000000", actual.PrintToString());
  }

  [Test]
  public void ShouldPrintSundayToString()
  {
    var actual = DayOfWeekFlag.Sunday;
    Assert.AreEqual("0000001", actual.PrintToString());
  }

  [Test]
  public void ShouldPrintToString()
  {
    var actual = DayOfWeekFlag.Monday | DayOfWeekFlag.Tuesday | DayOfWeekFlag.Sunday;
    Assert.AreEqual("1100001", actual.PrintToString());
  }

  [Test]
  public void ShouldParseNoneFromString()
  {
    var actual = DayOfWeekFlagUtils.FromString("a");
    Assert.AreEqual(DayOfWeekFlag.None, actual);
  }

  [Test]
  public void ShouldParseFromString()
  {
    var actual = DayOfWeekFlagUtils.FromString("1100001");
    Assert.AreEqual(DayOfWeekFlag.Monday | DayOfWeekFlag.Tuesday | DayOfWeekFlag.Sunday, actual);
  }
}