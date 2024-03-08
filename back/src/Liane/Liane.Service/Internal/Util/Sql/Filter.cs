using System;
using System.Collections;
using System.Collections.Immutable;
using System.Linq;
using System.Linq.Expressions;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Util.Sql;

public enum BooleanOperator
{
  And,
  Or
}

public enum ComparisonOperator
{
  Like,
  Ilike,
  Eq,
  Ne,
  Gt,
  Gte,
  Lt,
  Lte,
  In,
  Nin,
  Regex
}

public abstract record Filter<T>
{
  public static Filter<T> operator &(Filter<T> left, Filter<T> right) => left.And(right);
  public static Filter<T> operator |(Filter<T> left, Filter<T> right) => left.Or(right);

  public static Filter<T> Empty => new EmptyFilter();
  public static Filter<T> Regex(Expression<Func<T, object?>> field, object? operand) => new Condition(field, ComparisonOperator.Regex, operand);
  public static Filter<T> Where<TValue>(Expression<Func<T, TValue>> field, ComparisonOperator op, TValue operand) => new Condition(FieldDefinition<T>.From(field), op, operand);
  public static Filter<T> Where(Expression<Func<T, object?>> field, ComparisonOperator op, object? operand) => Where<object?>(field, op, operand);
  public static Filter<T> Where(FieldDefinition<T> field, ComparisonOperator op, object? operand) => new Condition(field, op, operand);

  public static Filter<T> Near(Expression<Func<T, LatLng?>> func, LatLng point, int radius)
  {
    var field = FieldDefinition<T>.From(func);
    var distance = new FieldDefinition<T>.Distance(field, point);
    return new NearFilter(distance, radius);
  }

  private sealed record EmptyFilter : Filter<T>
  {
    internal override string ToSql(NamedParams namedParams) => "";
  }

  private sealed record Condition(FieldDefinition<T> Field, ComparisonOperator Operator, object? Operand) : Filter<T>
  {
    internal override string ToSql(NamedParams namedParams)
    {
      var fd = Field.ToSql(namedParams);
      var operand = namedParams.Add(Operand);
      return Operator switch
      {
        ComparisonOperator.Ilike => $"{fd} ILIKE {operand}",
        ComparisonOperator.Like => $"{fd} LIKE {operand}",
        ComparisonOperator.Eq => $"{fd} = {operand}",
        ComparisonOperator.Ne => $"{fd} <> {operand}",
        ComparisonOperator.Gt => $"{fd} > {operand}",
        ComparisonOperator.Gte => $"{fd} >= {operand}",
        ComparisonOperator.Lt => $"{fd} < {operand}",
        ComparisonOperator.Lte => $"{fd} <= {operand}",
        ComparisonOperator.In => Operand is IEnumerable and not string ? $"{fd} = ANY({operand})" : $"{fd} IN ({operand})",
        ComparisonOperator.Nin => Operand is IEnumerable and not string ? $"NOT {fd} = ANY({operand})" : $"{fd} NOT IN ({operand})",
        ComparisonOperator.Regex => $"{fd} ~* {operand}",
        _ => throw new ArgumentOutOfRangeException($"Unknown operator {Operator.ToString()}")
      };
    }
  }

  private sealed record NearFilter(FieldDefinition<T>.Distance Distance, int Radius) : Filter<T>
  {
    internal override string ToSql(NamedParams namedParams)
    {
      return $"{Distance.ToSql(namedParams)} <= {namedParams.Add(Radius)}";
    }
  }

  private sealed record Boolean(BooleanOperator Operator, ImmutableList<Filter<T>> Operands) : Filter<T>
  {
    internal override string ToSql(NamedParams namedParams) => $"({string.Join($" {Operator.ToString().ToUpper()} ", Operands.Select(o => o.ToSql(namedParams)))})";
  }

  private Filter<T> And(Filter<T> right) => Combine(right, BooleanOperator.And);
  private Filter<T> Or(Filter<T> right) => Combine(right, BooleanOperator.Or);

  private Filter<T> Combine(Filter<T> right, BooleanOperator booleanOperator) => this switch
  {
    EmptyFilter => right,
    _ when right is EmptyFilter => this,
    Boolean b => b.Operator == booleanOperator ? new Boolean(booleanOperator, b.Operands.Add(right)) : new Boolean(booleanOperator, ImmutableList.Create(this, right)),
    _ => new Boolean(booleanOperator, ImmutableList.Create(this, right)),
  };

  internal abstract string ToSql(NamedParams namedParams);
}