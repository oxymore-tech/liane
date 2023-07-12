using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;

namespace Liane.Api.Util.Pagination;

public static class ExpressionHelper
{
  public static IEnumerable<MemberInfo> GetMembers<T>(Expression<Func<T, object?>> field)
  {
    var node = field.Body;
    while (node.NodeType is ExpressionType.Convert or ExpressionType.ConvertChecked or ExpressionType.Quote)
    {
      node = ((UnaryExpression)node).Operand;
    }

    if (node is not MemberExpression e)
    {
      throw new ArgumentException($"Must be a MemberExpression {node.NodeType}");
    }

    return ImmutableList.Create(e.Member);
  }

  public static MemberExpression GetMemberExpression<T>(Expression paramExpr, Expression<Func<T, object?>> field)
  {
    var members = GetMembers(field);

    var memberExpression = members.Reverse()
      .Aggregate<MemberInfo, MemberExpression?>(null, (current, memberInfo) => Expression.MakeMemberAccess(current ?? paramExpr, memberInfo));

    if (memberExpression is null)
    {
      throw new ArgumentException("Must have at least one member");
    }

    return memberExpression;
  }

  internal static Expression GetValueExpression(object? value, Type targetType)
  {
    var constant = Expression.Constant(value);
    if (targetType == typeof(DateTime))
    {
      return constant;
    }

    return Expression.Convert(constant, targetType);
  }
}