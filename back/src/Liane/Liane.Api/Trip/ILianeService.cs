using System;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeService : ICrudEntityService<LianeRequest, Liane>
{
  Task<PaginatedResponse<Liane>> List(LianeFilter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<ImmutableDictionary<Appointment, ImmutableList<Ref<User.User>>>> GetNextAppointments(DateTime from, TimeSpan window);

  Task<Liane> AddMember(Ref<Liane> liane, LianeMember newMember);
  Task<Liane?> RemoveMember(Ref<Liane> liane, Ref<User.User> member);

  Task<Match?> GetNewTrip(Ref<Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment);

  Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<LianeMatchDisplay> MatchWithDisplay(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);

  Task<ImmutableList<ClosestPickups>> GetDestinations(Ref<RallyingPoint> pickup, DateTime dateTime, int availableSeats = -1); //TODO remove

  Task<LianeDisplay> Display(LatLng pos, LatLng pos2, DateTime dateTime, bool includeLianes = false, CancellationToken cancellationToken = default);
  Task<FeatureCollection> DisplayGeoJson(LatLng pos, LatLng pos2, DateTime dateTime, CancellationToken cancellationToken = default);

  Task UpdateMissingWaypoints();
  Task UpdateDepartureTime(Ref<Liane> liane, DateTime departureTime);
  Task UpdateFeedback(Ref<Liane> liane, Feedback feedback);
  public Task<ImmutableList<ClosestPickups>> GetNearestLinks(LatLng pos, DateTime dateTime, int radius = 30_000, int availableSeats = -1);
  public Task<ImmutableList<ClosestPickups>> GetPickupLinks(LinkFilterPayload payload);
  Task<string> GetContact(Ref<Liane> id, Ref<User.User> requester, Ref<User.User> member);
}
