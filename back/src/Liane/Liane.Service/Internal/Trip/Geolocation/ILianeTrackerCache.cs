using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;
using Microsoft.Extensions.Caching.Memory;

namespace Liane.Service.Internal.Trip.Geolocation;

public interface ILianeTrackerCache
{
   IEnumerable<LianeTracker> Trackers { get; }

   LianeTracker? GetTracker(Ref<Api.Trip.Liane> liane);

   Task<LianeTracker> GetOrAddTracker(Ref<Api.Trip.Liane> liane, Func<Ref<Api.Trip.Liane>, Task<LianeTracker>> factory);

   LianeTracker? RemoveTracker(Ref<Api.Trip.Liane> liane);

}