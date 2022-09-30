using System;

namespace Liane.Api.Util.Ref;

public abstract record Ref<T> where T : class, IIdentity
{
    private Ref()
    {
    }

    public abstract void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor);

    public static implicit operator string(Ref<T> @ref) => @ref switch
    {
        Unresolved u => u.Id,
        Resolved r => r.Value.Id!,
        _ => throw new ArgumentOutOfRangeException(nameof(@ref), @ref, null)
    };

    public static implicit operator Ref<T>(string id) => new Unresolved(id);

    public static implicit operator Ref<T>(T value) => new Resolved(value);
    
    public static explicit operator T?(Ref<T> @ref) => @ref switch
    {
        Resolved r => r.Value,
        _ => null
    };

    public sealed record Unresolved(string Id) : Ref<T>
    {
        public override void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor)
        {
            unresolvedVisitor(Id);
        }
    }

    public sealed record Resolved(T Value) : Ref<T>
    {
        public override void Visit(Action<string> unresolvedVisitor, Action<T> resolvedVisitor)
        {
            resolvedVisitor(Value);
        }
    }
}