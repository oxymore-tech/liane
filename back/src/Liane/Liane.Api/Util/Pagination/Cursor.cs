using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.RegularExpressions;
using Liane.Api.Util.Ref;

namespace Liane.Api.Util.Pagination;

public abstract record Cursor
{
  private Cursor()
  {
  }

  public static Cursor From<TCursor>(IEnumerable<object?> values) where TCursor : Cursor
  {
    switch (typeof(TCursor))
    {
      case { } t when t == typeof(Natural):
      {
        var arg1 = values.First();
        if (arg1 is string id) return new Natural(id);
        break;
      }
      case { } t when t == typeof(Time):
      {
        var arg1 = values.First();
        var arg2 = values.Skip(1).First();
        if (arg1 is DateTime time && arg2 is string id) return new Time(time, id);
        break;
      }
    }

    throw new ArgumentException($"Bad cursor type :{typeof(TCursor).Name} with arguments [{string.Join(',', values.Select(v => v?.ToString()))}]");
  }

  private static readonly Regex TimestampPattern = new(@"\d+");

  public static Time Now() => new(DateTime.UtcNow, null);

  public static Cursor Parse(string raw)
  {
    var items = raw.Split("_");

    if (TimestampPattern.IsMatch(items[0]))
    {
      var unixTimestamp = (long)Convert.ChangeType(items[0], typeof(long));
      var dateTime = DateTimeOffset.FromUnixTimeMilliseconds(unixTimestamp).UtcDateTime;
      string? id = null;
      if (items.Length == 2)
      {
        id = items[1];
      }

      return new Time(dateTime, id);
    }

    if (items.Length > 1)
    {
      throw new ArgumentException($"Wrong cursor pattern {raw}");
    }

    return new Natural(items[0]);
  }

  public static implicit operator Cursor(string raw) => Parse(raw);

  public abstract ImmutableList<object?> GetFilterFields();

  public sealed record Natural(string Id) : Cursor
  {
    public override string ToString() => Id;

    public override ImmutableList<object?> GetFilterFields()
    {
      return ImmutableList.Create<object?>(Id);
    }
  }

  public sealed record Time(DateTime Timestamp, string? Id) : Cursor
  {
    public override string ToString()
    {
      return ((DateTimeOffset)Timestamp.ToUniversalTime()).ToUnixTimeMilliseconds() + (Id != null ? "_" + Id : "");
    }

    public override ImmutableList<object?> GetFilterFields()
    {
      return new object?[] { Timestamp, Id }.ToImmutableList();
    }
  }
}

public static class CursorExtensions
{
  public static Cursor ToCursor<T>(this T next) where T : IEntity => new Cursor.Time(next.CreatedAt!.Value, next.Id!.ToString()!);
}