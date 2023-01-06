using System;
using System.Threading.Tasks;

namespace Liane.Api.Util.Ref;

public abstract record Ref<T> where T : class, IIdentity
{
    private Ref()
    {
    }
    public string Id => this switch
    {
        Unresolved u => u.Id,
        Resolved r => r.Value.Id!,
        _ => throw new ArgumentOutOfRangeException()
    };

    public abstract Task<T> Resolve(Func<string, Task<T>> resolver);

    public abstract void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor);

    public static implicit operator string(Ref<T> @ref) => @ref.Id;

    public static implicit operator Ref<T>(string id) => new Unresolved(id);

    public static implicit operator Ref<T>(T value) => new Resolved(value);
    
    public static explicit operator T?(Ref<T> @ref) => @ref switch
    {
        Resolved r => r.Value,
        _ => null
    };

    public sealed record Unresolved(string Id) : Ref<T>
    {
        public override async Task<T> Resolve(Func<string, Task<T>> resolver)
        {
            return await resolver(Id);
        }

        public override void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor)
        {
            unresolvedVisitor(Id);
        }

        public override string ToString()
        {
            return $"{nameof(T)} {{ {nameof(Id)} = {Id} }}";
        }
    }

    public sealed record Resolved(T Value) : Ref<T>
    {
        public override Task<T> Resolve(Func<string, Task<T>> resolver)
        {
            return Task.FromResult(Value);
        }

        public override void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor)
        {
            resolvedVisitor(Value);
        }

        public override string ToString()
        {
            return Value.ToString()!;
        }
    }
}