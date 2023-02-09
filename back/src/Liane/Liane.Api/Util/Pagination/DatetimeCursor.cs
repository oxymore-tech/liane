using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Util.Pagination;

/// <summary>
/// A cursor indexing a datetime field and the Id field.
/// </summary>
/// <param name="Timestamp"></param> First index of the cursor
/// <param name="Id"></param> Second optional index 
public sealed record DatetimeCursor(DateTime Timestamp, string? Id = null) : IIdentity
{
  /// <summary>
  /// Converts to format "{UnixTimestamp}[_{Id}]".
  /// </summary>
  /// <returns></returns>
  public override string ToString()
  {
    return ((DateTimeOffset)Timestamp.ToUniversalTime()).ToUnixTimeMilliseconds() + (Id != null ? "_" + Id : "");
  }

  public static implicit operator string(DatetimeCursor cursor)
  {
    return cursor.ToString();
  }

  public static implicit operator DatetimeCursor?(string? raw)
  {
    return raw == null ? null : Parse(raw);
  }

  public static DatetimeCursor Parse(string raw)
  {
    var items = raw.Split("_");
    var unixTimestamp = (long)Convert.ChangeType(items[0], typeof(long));
    var dateTime = DateTimeOffset.FromUnixTimeMilliseconds(unixTimestamp).UtcDateTime;
    string? id = null;
    if (items.Length == 2)
    {
      id = items[1];
    }

    return new DatetimeCursor(dateTime, id);
  }

  public static DatetimeCursor Now()
  {
    return new DatetimeCursor(DateTime.Now);
  }
}