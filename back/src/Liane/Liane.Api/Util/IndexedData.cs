using System;
using System.Collections.Immutable;

namespace Liane.Api.Util
{
    public sealed class IndexedData<T> where T : class
    {
        private readonly ImmutableDictionary<string, ImmutableDictionary<object?, T>?> index;

        public IndexedData(ImmutableDictionary<string, ImmutableDictionary<object?, T>?> index)
        {
            this.index = index;
        }

        public T? Match(Func<string, object?> valueSelector)
        {
            foreach (var (key, keyIndex) in index)
            {
                var indexValue = valueSelector(key);
                if (indexValue != null)
                {
                    var valueFoundByIndex = keyIndex?.GetValueOrDefault(indexValue);
                    if (valueFoundByIndex != null) return valueFoundByIndex;
                }
            }

            return null;
        }
    }
}