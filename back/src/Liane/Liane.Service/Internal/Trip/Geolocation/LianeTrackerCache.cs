using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Caching.Memory;

namespace Liane.Service.Internal.Trip.Geolocation;

public sealed class LianeTrackerCache : ILianeTrackerCache
{
  
  private readonly ConcurrentDictionary<string, LianeTracker> trackers = new();
  public IEnumerable<LianeTracker> Trackers => trackers.Values;

  public LianeTracker? GetTracker(Ref<Api.Trip.Liane> liane)
  {
    trackers.TryGetValue(liane.Id, out var value);
    return value;
  }

  public async Task<LianeTracker> GetOrAddTracker(Ref<Api.Trip.Liane> liane, Func<Ref<Api.Trip.Liane>, Task<LianeTracker>> factory)
  {
    var found = trackers.TryGetValue(liane.Id, out var value);
    if (!found)
    {
      value = await factory(liane);
      trackers.TryAdd(liane.Id, value);
    }
    return value!;
  }

  public LianeTracker? RemoveTracker(Ref<Api.Trip.Liane> liane)
  {
    trackers.TryRemove(liane.Id, out var value);
    return value;
  }

}