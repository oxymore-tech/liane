using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Geolocation;

public interface ILianeTrackerCache
{
   IEnumerable<TripTracker> Trackers { get; }

   TripTracker? GetTracker(Ref<Api.Trip.Trip> liane);

   Task<TripTracker> GetOrAddTracker(Ref<Api.Trip.Trip> liane, Func<Ref<Api.Trip.Trip>, Task<TripTracker>> factory);

   Task RemoveTracker(Ref<Api.Trip.Trip> trip);

}