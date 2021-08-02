using System.Collections;
using System.Collections.Generic;
using System.Collections.Immutable;

namespace Liane.Api.Util
{
    public sealed class Batch<T> : IEnumerable<T>
    {
        private readonly ImmutableList<T> rows;

        public Batch(ImmutableList<T> rows, int startIndex)
        {
            this.rows = rows;
            StartIndex = startIndex;
            Size = rows.Count;
        }

        public int StartIndex { get; }
        public int Size { get; }

        public IEnumerator<T> GetEnumerator()
        {
            return rows.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return rows.GetEnumerator();
        }
    }
}