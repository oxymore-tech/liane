using System;
using System.Threading.Tasks;

namespace Liane.Api.Util.Ref;

public abstract record Ref<T>
  where T : class, IIdentity
{
  private Ref()
  {
  }

  public abstract Task<T> Resolve(Func<Ref<T>, Task<T>> resolver);

  public abstract void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor);

  public static implicit operator string(Ref<T> @ref) => @ref.Id;

#nullable disable
  public static implicit operator Ref<T>(Guid? id) => id?.ToString();
  public static implicit operator Ref<T>(string id) => id is null ? null : new Unresolved(id);

  public static implicit operator Ref<T>(T value) => new Resolved(value);
#nullable enable

  public static explicit operator T?(Ref<T> @ref) => @ref switch
  {
    Resolved r => r.Value,
    _ => null
  };

  public bool Equals(Unresolved? other)
  {
    if (ReferenceEquals(null, other)) return false;
    if (ReferenceEquals(this, other)) return true;
    return Id == other.Id;
  }

  public override int GetHashCode()
  {
    return Id.GetHashCode();
  }

  public Guid IdAsGuid() => Guid.Parse(Id);
  public abstract string Id { get; init; }
  public abstract T? Value { get; init; }

  public sealed record Unresolved(string Id) : Ref<T>
  {
    public override async Task<T> Resolve(Func<Ref<T>, Task<T>> resolver)
    {
      return await resolver(Id);
    }

    public override void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor)
    {
      unresolvedVisitor(Id);
    }

    public override string ToString()
    {
      return Id;
    }

    public override T? Value
    {
      get => null;
      init => throw new NotImplementedException();
    }
  }

  public sealed record Resolved(T Value) : Ref<T>
  {
    public override string Id
    {
      get => Value.Id!.ToString()!;
      init { }
    }

    public override Task<T> Resolve(Func<Ref<T>, Task<T>> resolver)
    {
      return Task.FromResult(Value);
    }

    public override void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor)
    {
      resolvedVisitor(Value);
    }

    public override string ToString()
    {
      return Id;
    }
  }
}