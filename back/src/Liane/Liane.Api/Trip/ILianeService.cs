using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeService : ICrudEntityService<LianeRequest, Liane>
{
  Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination);
  Task<PaginatedResponse<Liane>> ListForCurrentUser(Pagination pagination);
  Task<PaginatedResponse<Liane>> ListAll(Pagination pagination);
  Task<PaginatedResponse<Liane>> ListForMemberUser(string userId, Pagination pagination);
  Task<Liane> AddMember(Ref<Api.Trip.Liane> liane, LianeMember newMember);
  Task<Liane?> RemoveMember(Ref<Api.Trip.Liane> liane, Ref<User.User> member);
  Task<(ImmutableSortedSet<WayPoint> wayPoints, MatchType matchType)?> GetNewTrip(Ref<Api.Trip.Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment);
}