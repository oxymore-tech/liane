using System;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Geolocation;

public interface ILianeTrackerService
{
  const double NearPointDistanceInMeters = 100;
  Task<LianeTracker> Start(Api.Trip.Liane liane, Action? onReachedDestination = null);
  Task PushPing(Ref<Api.Trip.Liane> liane, UserPing ping);
  Task SyncTrackers();
  Task<FeatureCollection> GetGeolocationPings(Ref<Api.Trip.Liane> liane);
  Task<FeatureCollection> GetGeolocationPingsForCurrentUser(Ref<Api.Trip.Liane> liane);
  Task RecreateReport(Ref<Api.Trip.Liane> liane);

}