using System;
using System.Threading.Tasks;

namespace Liane.Api.Util.Ref;

public abstract record Ref<T>
  where T : class, IIdentity
{
  private Ref()
  {
  }

  public string Id => this switch
  {
    Unresolved u => u.RefId,
    Resolved r => r.Value.Id!,
    _ => throw new ArgumentOutOfRangeException()
  };

  public abstract Task<T> Resolve(Func<Ref<T>, Task<T>> resolver);

  public abstract void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor);

  public static implicit operator string(Ref<T> @ref) => @ref.Id;

  public static implicit operator Ref<T>(string id) => new Unresolved(id);

  public static implicit operator Ref<T>(T value) => new Resolved(value);

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

  public abstract T? Value { get; init; }

  public sealed record Unresolved(string RefId) : Ref<T>
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