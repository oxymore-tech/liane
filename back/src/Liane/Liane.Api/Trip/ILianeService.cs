using System;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeService : ICrudEntityService<LianeRequest, Liane>
{
  Task<PaginatedResponse<Liane>> List(LianeFilter filter, Pagination pagination, CancellationToken cancellationToken = default);

  Task<Liane> AddMember(Ref<Liane> liane, LianeMember newMember);
  Task<Liane?> RemoveMember(Ref<Liane> liane, Ref<User.User> member);

  Task<Match?> GetNewTrip(Ref<Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment);

  Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);
  Task<LianeMatchDisplay> MatchWithDisplay(Filter filter, Pagination pagination, CancellationToken cancellationToken = default);

  Task UpdateDepartureTime(Ref<Liane> liane, DateTime departureTime);
  Task UpdateFeedback(Ref<Liane> liane, Feedback feedback);
  public Task<ImmutableList<ClosestPickups>> GetPickupLinks(LinkFilterPayload payload);
  Task<string> GetContact(Ref<Liane> id, Ref<User.User> requester, Ref<User.User> member);
}