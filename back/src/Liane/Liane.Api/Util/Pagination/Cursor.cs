using System;
using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Liane.Api.Util.Ref;

namespace Liane.Api.Util.Pagination;

public abstract record Cursor
{
  private Cursor()
  {
  }

  public static Cursor From<TCursor, T>(T e, Expression<Func<T, object?>> paginationField) where T : IIdentity where TCursor: Cursor
  {
    
    switch (typeof(TCursor))
    {
      case { } t when t == typeof(Natural):
        return new Natural(e.Id!);
      case { } t when t == typeof(Time):
        return new Time((DateTime?)paginationField.Compile()(e) ?? DateTime.UtcNow, e.Id!);
      default:
        throw new ArgumentException("Bad cursor type : " + typeof(TCursor).Name);
    }
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

  public static implicit operator string(Cursor cursor) => cursor.ToString();

  public static implicit operator Cursor(string raw) => Parse(raw);

  public abstract Expression<Func<T, bool>> ToFilter<T>(bool sortAsc, Expression<Func<T, object?>> paginationField) where T : IIdentity;

  public sealed record Natural(string Id) : Cursor
  {

    public override Expression<Func<T, bool>> ToFilter<T>(bool sortAsc, Expression<Func<T, object?>> paginationField)
    {
      var paramExpr = Expression.Parameter(typeof(T), "e");
      var memberExpression = ExpressionHelper.GetMemberExpression(paramExpr, (T e) => e.Id);
      var constantExpression = ExpressionHelper.GetValueExpression(Id, memberExpression.Type);
      var body = (Expression)Expression.MakeBinary(
        sortAsc ? ExpressionType.GreaterThan : ExpressionType.LessThan,
        memberExpression,
        constantExpression);
      return Expression.Lambda<Func<T, bool>>(body, paramExpr);
    }

    public override string ToString() => Id;
  }

  public sealed record Time(DateTime Timestamp, string? Id) : Cursor
  {

    public override Expression<Func<T, bool>> ToFilter<T>(bool sortAsc, Expression<Func<T, object?>> paginationField)
    {
      var paramExpr = Expression.Parameter(typeof(T), "e");
      var memberExpression = ExpressionHelper.GetMemberExpression(paramExpr, paginationField);
      var constantExpression = ExpressionHelper.GetValueExpression(Timestamp, memberExpression.Type);
      var body = (Expression)Expression.MakeBinary(
        sortAsc ? ExpressionType.GreaterThan : ExpressionType.LessThan,
        memberExpression,
        constantExpression);
      // TODO compare id when id defined in the cursor and date are equals
      return Expression.Lambda<Func<T, bool>>(body, paramExpr);
    }

    public override string ToString()
    {
      return ((DateTimeOffset)Timestamp.ToUniversalTime()).ToUnixTimeMilliseconds() + (Id != null ? "_" + Id : "");
    }
  }
}