namespace Liane.Service.Internal.Util.Sql;

public sealed record SortDefinition<T>(FieldDefinition<T> FieldDefinition, bool Asc = true)
{
  public static implicit operator SortDefinition<T>(FieldDefinition<T> field) => new(field);

  public SortDefinition<T> Desc() => this with { Asc = false };
}