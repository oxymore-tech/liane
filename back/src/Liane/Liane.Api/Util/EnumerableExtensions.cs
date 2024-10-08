using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Util;

public static class EnumerableExtensions
{
  public static (IEnumerable<T>, IEnumerable<T>) Split<T>(this IEnumerable<T> input, Func<T, bool> predicate)
  {
    var left = new List<T>();
    var right = new List<T>();

    foreach (var item in input)
    {
      if (predicate(item))
      {
        left.Add(item);
      }
      else
      {
        right.Add(item);
      }
    }

    return (left, right);
  }

  public static IEnumerable<T> TakeUntil<T>(this IEnumerable<T> input, T until) where T : notnull
  {
    bool found;
    return input.TakeWhile(i =>
    {
      found = i.Equals(until);
      return !found;
    });
  }

  public static async IAsyncEnumerable<Batch<T>> Batch<T>(this IAsyncEnumerable<T> input, int batchSize = 10_000)
  {
    var batch = new List<T>(batchSize);

    var index = 0;
    await foreach (var item in input)
    {
      batch.Add(item);
      if (batch.Count == batchSize)
      {
        yield return new Batch<T>(batch.ToImmutableList(), index);
        batch.Clear();
      }

      index++;
    }

    if (batch.Count > 0) yield return new Batch<T>(batch.ToImmutableList(), index);
  }

  public static IEnumerable<TOut> FilterSelect<T, TOut>(this IEnumerable<T> enumerable, Func<T, TOut?> transformer)
    where TOut : notnull
  {
    return enumerable.Select(transformer)
      .Where(e => e is not null)
      .Select(e => e!);
  }

  public static IEnumerable<TOut> FilterSelectMany<T, TOut>(this IEnumerable<T> enumerable, Func<T, IEnumerable<TOut?>> transformer)
    where TOut : notnull
  {
    return enumerable.SelectMany(transformer)
      .Where(e => e is not null)
      .Select(e => e!);
  }

  public static IEnumerable<TOut> FilterSelectMany<T, TOut>(this IEnumerable<T> enumerable, Func<T, IEnumerable<TOut?>> transformer)
    where TOut : struct
  {
    return enumerable.SelectMany(transformer)
      .Where(e => e is not null)
      .Select(e => e!.Value);
  }

  public static IEnumerable<TOut> FilterSelect<T, TOut>(this IEnumerable<T> enumerable, Func<T, TOut?> transformer)
    where TOut : struct
  {
    return enumerable.Select(transformer)
      .Where(e => e is not null)
      .Select(e => e!.Value);
  }

  public static async Task<IEnumerable<TOut>> FilterSelectAsync<T, TOut>(this IEnumerable<T> enumerable, Func<T, Task<TOut?>> transformer)
    where TOut : notnull
  {
    return (await enumerable.SelectAsync(transformer))
      .Where(e => e is not null)
      .Select(e => e!);
  }

  public static async Task<IEnumerable<TOut>> FilterSelectAsync<T, TOut>(this IEnumerable<T> enumerable, Func<T, Task<TOut?>> transformer)
    where TOut : struct
  {
    return (await enumerable.SelectAsync(transformer))
      .Where(e => e is not null)
      .Select(e => e!.Value);
  }

  public static async Task<ImmutableList<TOut>> SelectAsync<T, TOut>(this IEnumerable<T> enumerable, Func<T, Task<TOut>> transformer, bool parallel = false)
  {
    var outs = ImmutableList.CreateBuilder<TOut>();

    foreach (var task in parallel ? enumerable.AsParallel().Select(transformer) : enumerable.Select(transformer))
    {
      outs.Add(await task);
    }

    return outs.ToImmutableList();
  }

  public static async Task<ImmutableList<TOut>> SelectManyAsync<T, TOut>(this IEnumerable<T> enumerable, Func<T, Task<IEnumerable<TOut>>> transformer, bool parallel = false)
  {
    var outs = ImmutableList.CreateBuilder<TOut>();

    foreach (var task in parallel ? enumerable.AsParallel().Select(transformer) : enumerable.Select(transformer))
    {
      outs.AddRange(await task);
    }

    return outs.ToImmutableList();
  }

  public static async Task<ImmutableList<TOut>> SelectAsync<T, TOut>(this IEnumerable<T> enumerable, Func<T, int, Task<TOut>> transformer, bool parallel = false)
  {
    var outs = ImmutableList.CreateBuilder<TOut>();

    foreach (var task in parallel ? enumerable.AsParallel().Select(transformer) : enumerable.Select(transformer))
    {
      outs.Add(await task);
    }

    return outs.ToImmutableList();
  }

  public static async Task<ImmutableDictionary<TKey, TOutput>> GroupByAsync<TKey, T, TOutput>(
    this IEnumerable<T> enumerable,
    Func<T, TKey> keySelector,
    Func<IGrouping<TKey, T>, Task<TOutput>> groupMapper) where TKey : notnull
  {
    var outputs = new Dictionary<TKey, TOutput>();
    foreach (var g in enumerable.GroupBy(keySelector))
    {
      outputs.Add(g.Key, await groupMapper(g));
    }

    return outputs.ToImmutableDictionary();
  }

  private static IEnumerable<T> Sort<T, TField>(this IEnumerable<T> enumerable, bool sortAsc, Func<T, TField>? sortField)
    where T : IIdentity
  {
    if (sortField is not null)
    {
      enumerable = sortAsc
        ? enumerable.OrderBy(sortField)
        : enumerable.OrderByDescending(sortField);
    }

    enumerable = sortAsc
      ? enumerable.OrderBy(e => e.Id)
      : enumerable.OrderByDescending(e => e.Id);

    return enumerable;
  }
}