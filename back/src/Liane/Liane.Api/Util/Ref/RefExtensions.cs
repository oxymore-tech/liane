using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Util.Ref;

public static class RefExtensions
{
  public static Ref<T> AsRef<T>(this string id)
    where T : class, IIdentity<string>
  {
    return id;
  }

  public static Ref<T> AsRef<T>(this T value)
    where T : class, IIdentity<string>
  {
    return value.Id!.AsRef<T>();
  }

  public static ImmutableList<Ref<T>> AsRef<T>(this IEnumerable<string> input) where T : class, IIdentity
    => input.Select(r => (Ref<T>)r).ToImmutableList();

  public static string[] Deref<T>(this ImmutableList<Ref<T>> input) where T : class, IIdentity
    => input.Select(r => r.Id).ToArray();
}