using System.Collections;
using System.Collections.Generic;

namespace Liane.Service.Internal.Util;

public class BufferedList<T>: IReadOnlyCollection<T>
{
  private int capacity;
  private LinkedList<T> list = new  ();
  private readonly object accessLock = new  ();

  public int Count => list.Count;

  public BufferedList(int capacity)
  {
    this.capacity = capacity;   
  }

  public void Add(T item)
  {
    lock (accessLock)
    {
      if (list.Count == capacity) list.RemoveLast();
      list.AddFirst(item);
    }
  }

  public T? Peek()
  {
     return list.First is not null ? list.First.Value : default;
  }

  public IEnumerator<T> GetEnumerator()
  {
    return list.GetEnumerator();
  }

  IEnumerator IEnumerable.GetEnumerator()
  {
    return GetEnumerator();
  }
}