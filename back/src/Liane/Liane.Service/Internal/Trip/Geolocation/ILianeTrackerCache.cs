using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Caching.Memory;

namespace Liane.Service.Internal.Trip.Geolocation;

public interface ILianeTrackerCache
{
   IEnumerable<LianeTracker> Trackers { get; }

   LianeTracker? GetTracker(Ref<Api.Trip.Trip> liane);

   Task<LianeTracker> GetOrAddTracker(Ref<Api.Trip.Trip> liane, Func<Ref<Api.Trip.Trip>, Task<LianeTracker>> factory);

   LianeTracker? RemoveTracker(Ref<Api.Trip.Trip> liane);

}