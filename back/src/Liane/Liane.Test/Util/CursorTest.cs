using System;
using Liane.Api.Util.Pagination;
using NUnit.Framework;

namespace Liane.Test.Util;

[TestFixture]
public sealed class CursorTest
{
  [Test]
  public void ShouldConvertToStringDatetime()
  {
    var id = "12334";
    var date = DateTime.UtcNow;
    var dateStr = ((DateTimeOffset)date).ToUnixTimeMilliseconds();
    var cursor = (Cursor)$"{dateStr}_{id}";
    Assert.IsInstanceOf<Cursor.Time>(cursor);
    Assert.AreEqual(id, ((Cursor.Time)cursor).Id);
    Assert.AreEqual(DateTimeOffset.FromUnixTimeMilliseconds(dateStr).UtcDateTime, ((Cursor.Time)cursor).Timestamp.ToUniversalTime());
  }
  
  [Test]
  public void ShouldConvertToCursorString()
  {
    var id = "12334";
    var date = DateTime.UtcNow;
    var dateStr = ((DateTimeOffset)date).ToUnixTimeMilliseconds();
    var cursor = (Cursor)$"{dateStr}_{id}";
    var strCursor = (string)cursor;
    Assert.AreEqual($"{dateStr}_{id}", strCursor);
  }
  
}