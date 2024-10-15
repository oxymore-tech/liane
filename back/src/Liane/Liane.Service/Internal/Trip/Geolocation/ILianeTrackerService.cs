using System;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Geolocation;

public interface ILianeTrackerService
{
  const double NearPointDistanceInMeters = 100;
  Task<LianeTracker> Start(Api.Trip.Trip trip, Action? onReachedDestination = null);
  Task SendPing(MemberPing ping);
  Task PushPing(Ref<Api.Trip.Trip> liane, UserPing ping);
  Task SyncTrackers();
  Task<FeatureCollection> GetGeolocationPings(Ref<Api.Trip.Trip> liane);
  Task<FeatureCollection> GetGeolocationPingsForCurrentUser(Ref<Api.Trip.Trip> liane);
  Task RecreateReport(Ref<Api.Trip.Trip> liane);
}