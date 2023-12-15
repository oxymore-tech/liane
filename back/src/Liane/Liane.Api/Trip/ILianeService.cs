using System;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeService : ICrudEntityService<LianeRequest, Liane>
{
  Task<PaginatedResponse<Liane>> List(LianeFilter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<Liane> AddMember(Ref<Liane> liane, LianeMember newMember);
  Task<Liane?> RemoveMember(Ref<Liane> liane, Ref<User.User> member);
  Task CancelAllTrips(Ref<User.User> member);
  Task<Match?> GetNewTrip(Ref<Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment);
  Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<LianeMatchDisplay> MatchWithDisplay(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task UpdateState(Ref<Liane> liane, LianeState state);
  Task UpdateFeedback(Ref<Liane> liane, Feedback feedback);
  Task<string> GetContact(Ref<Liane> id, Ref<User.User> requester, Ref<User.User> member);
  Task<Liane> UpdateDepartureTime(Ref<Liane> liane, DateTime departureTime);
  Task RemoveRecurrence(Ref<LianeRecurrence> recurrence);
  Task<ImmutableList<Liane>> CreateFromRecurrence(Ref<LianeRecurrence> recurrence, Ref<Api.User.User>? owner = null, int daysAhead = 7);
  Task<Liane> GetForCurrentUser(Ref<Liane> l, Ref<Api.User.User>? user = null);
  Task<PaginatedResponse<DetailedLianeTrackReport>> ListTripRecords(Pagination pagination, TripRecordFilter filter);
  Task<DetailedLianeTrackReport> GetTripRecord(string id);
  Task<FeatureCollection> GetRawGeolocationPings(Ref<Liane> liane);
  Task ForceSyncDatabase();
  Task UpdateGeolocationSetting(Ref<Liane> liane, GeolocationLevel level);
  Task CancelLiane(Ref<Liane> liane);
  Task StartLiane(Ref<Liane> liane);
}
