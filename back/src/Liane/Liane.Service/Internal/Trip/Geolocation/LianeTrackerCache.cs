using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Geolocation;

public sealed class LianeTrackerCache : ILianeTrackerCache
{
  
  private readonly ConcurrentDictionary<string, TripTracker> trackers = new();
  public IEnumerable<TripTracker> Trackers => trackers.Values;

  public TripTracker? GetTracker(Ref<Api.Trip.Trip> liane)
  {
    trackers.TryGetValue(liane.Id, out var value);
    return value;
  }

  public async Task<TripTracker> GetOrAddTracker(Ref<Api.Trip.Trip> liane, Func<Ref<Api.Trip.Trip>, Task<TripTracker>> factory)
  {
    var found = trackers.TryGetValue(liane.Id, out var value);
    if (!found)
    {
      value = await factory(liane);
      trackers.TryAdd(liane.Id, value);
    }
    return value!;
  }

  public async Task RemoveTracker(Ref<Api.Trip.Trip> trip)
  {
    trackers.TryRemove(trip.Id, out var value);
    if (value is not null)
    {
      await value.Dispose();
    }
  }

}