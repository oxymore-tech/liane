using System.Collections.Concurrent;
using System.Collections.Generic;
using Liane.Api.Trip;
using Microsoft.Extensions.Caching.Memory;

namespace Liane.Service.Internal.Trip;

public sealed class LianeTrackerCache
{
  public MemoryCache CurrentConnections { get; } = new(new MemoryCacheOptions());

  // TODO periodically clean disconnected users and outdated pairs (string Liane, string Member)
  public MemoryCache LastPositions { get; } = new(new MemoryCacheOptions());

  public ConcurrentDictionary<string, LianeTracker> Trackers { get; } = new();
}