using System;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Geolocation;

public interface ILianeTrackerService
{
  const double NearPointDistanceInMeters = 100;
  Task<LianeTracker> Start(Api.Trip.Liane liane, Action? onReachedDestination = null);
  Task PushPing(Ref<Api.Trip.Liane> liane, UserPing ping);
  Task SyncTrackers();
}