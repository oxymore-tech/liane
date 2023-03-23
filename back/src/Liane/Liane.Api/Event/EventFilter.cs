using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record EventFilter(
  bool AsRecipient,
  Ref<Trip.Liane>? Liane,
  ITypeOf<LianeEvent>? Type
);

public interface ITypeOf<out T> where T : class
{
  Type Type { get; }
}

public sealed record TypeOf<T> : ITypeOf<T>
  where T : class
{
  public static TypeOf<TT> From<TT>() where TT : class, T
  {
    return new TypeOf<TT>();
  }

  public Type Type => typeof(T);
}