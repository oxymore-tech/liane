using System.Collections.Generic;
using System.Collections.Immutable;

namespace Liane.Api.Util;

public static class EnumerableExtensions
{
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
}