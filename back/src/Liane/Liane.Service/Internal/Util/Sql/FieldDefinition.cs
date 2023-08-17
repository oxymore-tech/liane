using System;
using System.Linq.Expressions;
using System.Reflection;
using Liane.Api.Routing;
using Liane.Api.Util.Pagination;

namespace Liane.Service.Internal.Util.Sql;

public abstract record FieldDefinition<T>
{
  public static implicit operator FieldDefinition<T>(Expression<Func<T, object?>> field) => From(field);
  public static implicit operator FieldDefinition<T>(string expression) => From(expression);

  public static FieldDefinition<T> From<TValue>(Expression<Func<T, TValue>> field) => From(field.Body);
  public static FieldDefinition<T> From(Expression<Func<T, object?>> field) => From(field.Body);

  public static FieldDefinition<T> From(string expression, params object[] args) => new Expr(expression, args);

  public static FieldDefinition<T> From(Expression expression)
  {
    var node = expression;
    while (node.NodeType is ExpressionType.Convert or ExpressionType.ConvertChecked or ExpressionType.Quote)
    {
      node = ((UnaryExpression)node).Operand;
    }

    if (node is MemberExpression e)
    {
      return new Member(e.Member);
    }

    if (node is MethodCallExpression m)
    {
      if (m.Method.Name == "Distance")
      {
        var to = ExpressionHelper.GetExpressionValue<LatLng>(m.Arguments[0]);
        return new Distance(From(m.Object!), to);
      }
    }

    throw new ArgumentOutOfRangeException();
  }
  
  internal abstract string ToSql(NamedParams namedParams);

  public sealed record Member(MemberInfo MemberInfo) : FieldDefinition<T>
  {
    internal override string ToSql(NamedParams namedParams) => Mapper.GetColumnName(MemberInfo.Name);
  }

  public sealed record Expr(string Expression, params object[] Args) : FieldDefinition<T>
  {
    internal override string ToSql(NamedParams namedParams)
    {
      foreach (var arg in Args)
      {
        namedParams.Add(arg);
      }

      return Expression;
    }
  }

  public sealed record Distance(FieldDefinition<T> FieldDefinition, LatLng To) : FieldDefinition<T>
  {
    internal override string ToSql(NamedParams namedParams) =>
      $"ST_DistanceSphere({FieldDefinition.ToSql(namedParams)}, ST_MakePoint({namedParams.Add(To.Lng)},{namedParams.Add(To.Lat)}))";
  }
}