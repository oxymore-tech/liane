using System;
using System.Linq.Expressions;

namespace Liane.Api.Util.Pagination;

internal static class ExpressionHelper
{
  internal static MemberExpression GetMemberExpression<T>(Expression paramExpr, Expression<Func<T, object?>> paginationField)
  {
    var node = paginationField.Body;
    while (node.NodeType is ExpressionType.Convert or ExpressionType.ConvertChecked or ExpressionType.Quote)
    {
      node = ((UnaryExpression)node).Operand;
    }

    if (node is not MemberExpression e)
    {
      throw new ArgumentException($"Must be a MemberExpression {node.NodeType}");
    }

    return Expression.MakeMemberAccess(paramExpr, e.Member);
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