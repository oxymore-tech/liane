using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;

namespace Liane.Api.Util.Ref;

public static class RefExtensions
{
  public static Ref<T> AsRef<T>(this Guid id)
    where T : class, IIdentity<Guid>
  {
    return id;
  }
  
  public static Ref<T> AsRef<T>(this string id)
    where T : class, IIdentity<string>
  {
    return id;
  }

  public static async Task<T> AsRef<T>(this string id, Func<Ref<T>, Task<T>> resolver)
    where T : class, IIdentity<string>
  {
    return await resolver(id);
  }

  public static Ref<T> AsRef<T>(this T value)
    where T : class, IIdentity<string>
  {
    return value.Id!.AsRef<T>();
  }

  public static Task<ImmutableList<Ref<T>>> AsRef<T>(this IEnumerable<string> input, Func<Ref<T>, Task<T>> resolver) where T : class, IIdentity<string> =>
    input.SelectAsync(async r => (Ref<T>)await r.AsRef(resolver));

  public static ImmutableList<Ref<T>> AsRef<T>(this IEnumerable<string> input) where T : class, IIdentity
    => input.Select(r => (Ref<T>)r).ToImmutableList();

  public static string[] Deref<T>(this ImmutableList<Ref<T>> input) where T : class, IIdentity
    => input.Select(r => r.Id).ToArray();
}