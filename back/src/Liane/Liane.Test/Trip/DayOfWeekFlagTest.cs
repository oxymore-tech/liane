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
    Assert.AreEqual("1000000", actual.ToString());
  }

  [Test]
  public void ShouldPrintSundayToString()
  {
    var actual = DayOfWeekFlag.Sunday;
    Assert.AreEqual("0000001", actual.ToString());
  }

  [Test]
  public void ShouldPrintToString()
  {
    var actual = DayOfWeekFlag.Monday | DayOfWeekFlag.Tuesday | DayOfWeekFlag.Sunday;
    Assert.AreEqual("1100001", actual.ToString());
  }

  [Test]
  public void ShouldParseNoneFromString()
  {
    var actual = DayOfWeekFlag.Parse("a");
    Assert.AreEqual(DayOfWeekFlag.Empty, actual);
  }

  [Test]
  public void ShouldParseFromString()
  {
    var actual = DayOfWeekFlag.Parse("1100001");
    Assert.AreEqual(DayOfWeekFlag.Monday | DayOfWeekFlag.Tuesday | DayOfWeekFlag.Sunday, actual);
  }
}