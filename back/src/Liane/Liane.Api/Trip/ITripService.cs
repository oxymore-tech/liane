using System;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ITripService : ICrudEntityService<TripRequest, Trip>
{
  Task<PaginatedResponse<Trip>> List(TripFilter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<Trip> AddMember(Ref<Trip> trip, TripMember newMember);
  Task<Trip?> RemoveMember(Ref<Trip> trip, Ref<Auth.User> member);
  Task CancelAllTrips(Ref<Auth.User> member);
  Task<Match?> GetNewTrip(Ref<Trip> trip, RallyingPoint from, RallyingPoint to, bool isDriverSegment);
  Task<PaginatedResponse<TripMatch>> Match(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<LianeMatchDisplay> MatchWithDisplay(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task UpdateState(Ref<Trip> trip, TripState state);
  Task UpdateFeedback(Ref<Trip> trip, Feedback feedback);
  Task<string> GetContact(Ref<Trip> id, Ref<Auth.User> requester, Ref<Auth.User> member);
  Task<Trip> UpdateDepartureTime(Ref<Trip> trip, DateTime departureTime);
  Task RemoveRecurrence(Ref<TripRecurrence> recurrence);
  Task<ImmutableList<Trip>> CreateFromRecurrence(Ref<TripRecurrence> recurrence, Ref<Auth.User>? owner = null, int daysAhead = 7);
  Task<Trip> GetForCurrentUser(Ref<Trip> l, Ref<Auth.User>? user = null);
  Task<PaginatedResponse<DetailedTripTrackReport>> ListTripRecords(Pagination pagination, TripRecordFilter filter);
  Task<DetailedTripTrackReport> GetTripRecord(string id);
  Task<FeatureCollection> GetRawGeolocationPings(Ref<Trip> trip);
  Task ForceSyncDatabase();
  Task UpdateGeolocationSetting(Ref<Trip> trip, GeolocationLevel level);
  Task CancelTrip(Ref<Trip> trip);
  Task StartTrip(Ref<Trip> trip);
}