using System;
using Liane.Api.Util.Pagination;
using NUnit.Framework;

namespace Liane.Test.Util;

[TestFixture]
public class TestCursor
{
  [Test]
  public void ShouldConvertToStringDatetime()
  {
    var id = "12334";
    var date = DateTime.UtcNow;
    var dateStr = ((DateTimeOffset)date).ToUnixTimeMilliseconds();
    var cursor = (DatetimeCursor)$"{dateStr}_{id}";
    Assert.AreEqual(id, cursor.Id);
    Assert.AreEqual(DateTimeOffset.FromUnixTimeMilliseconds(dateStr).UtcDateTime, cursor.Timestamp.ToUniversalTime());
  }
  
  [Test]
  public void ShouldConvertToCursorString()
  {
    var id = "12334";
    var date = DateTime.UtcNow;
    var dateStr = ((DateTimeOffset)date).ToUnixTimeMilliseconds();
    var cursor = (DatetimeCursor)$"{dateStr}_{id}";
    var strCursor = (string)cursor;
    Assert.AreEqual($"{dateStr}_{id}", strCursor);
  }
  
}