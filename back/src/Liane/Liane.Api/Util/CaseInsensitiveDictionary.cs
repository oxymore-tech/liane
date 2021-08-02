using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Diagnostics.CodeAnalysis;

namespace Liane.Api.Util
{
    public sealed class CaseInsensitiveDictionary<T> : IReadOnlyDictionary<string, T>
    {
        private readonly IReadOnlyDictionary<string, T> backing;

        public CaseInsensitiveDictionary(ImmutableDictionary<string, T> backing)
        {
            this.backing = backing.WithComparers(StringComparer.InvariantCultureIgnoreCase);
        }

        public IEnumerator<KeyValuePair<string, T>> GetEnumerator()
        {
            return backing.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return ((IEnumerable) backing).GetEnumerator();
        }

        public int Count => backing.Count;

        public bool ContainsKey(string key)
        {
            return backing.ContainsKey(key);
        }

        public bool TryGetValue(string key, [MaybeNullWhen(false)] out T value)
        {
            return backing.TryGetValue(key, out value);
        }

        public T this[string key] => backing[key];

        public IEnumerable<string> Keys => backing.Keys;

        public IEnumerable<T> Values => backing.Values;
    }
}