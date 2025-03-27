using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Auth;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ITripService : ICrudEntityService<TripRequest, Trip>
{
  Task<PaginatedResponse<Trip>> List(TripFilter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<ImmutableList<Trip>> GetIncomingTrips(IEnumerable<Ref<Community.Liane>> lianeFilter);
  Task<Trip> AddMember(Ref<Trip> trip, TripMember newMember);
  Task<Trip?> RemoveMember(Ref<Trip> trip, Ref<User> member);
  Task CancelAllTrips(Ref<User> member);
  Task<Match?> GetNewTrip(Ref<Trip> trip, RallyingPoint from, RallyingPoint to, bool isDriverSegment);
  Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<LianeMatchDisplay> MatchWithDisplay(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task UpdateState(Ref<Trip> trip, TripStatus state);
  Task UpdateFeedback(Ref<Trip> trip, Feedback feedback);
  Task UpdateFeedback(Ref<Trip> trip, Ref<User> member, Feedback feedback);
  Task<string> GetContact(Ref<Trip> id, Ref<User> requester, Ref<User> member);
  Task<Trip> UpdateDepartureTime(Ref<Trip> trip, DateTime departureTime);
  Task<PaginatedResponse<DetailedLianeTrackReport>> ListTripRecords(Pagination pagination, TripRecordFilter filter);
  Task<DetailedLianeTrackReport> GetTripRecord(string id);
  Task<FeatureCollection> GetRawGeolocationPings(Ref<Trip> trip);
  Task UpdateGeolocationSetting(Ref<Trip> trip, GeolocationLevel level);
  Task CancelTrip(Ref<Trip> trip);
  Task StartTrip(Ref<Trip> trip);
}