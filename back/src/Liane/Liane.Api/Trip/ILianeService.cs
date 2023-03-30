using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeService : ICrudEntityService<LianeRequest, Liane>
{
  Task<PaginatedResponse<Liane>> ListForCurrentUser(Pagination pagination);
  Task<PaginatedResponse<Liane>> ListAll(Pagination pagination);
  Task<Liane> AddMember(Ref<Liane> liane, LianeMember newMember);
  Task<Liane?> RemoveMember(Ref<Liane> liane, Ref<User.User> member);
  Task<(ImmutableSortedSet<WayPoint> wayPoints, Match matchType)?> GetNewTrip(Ref<Liane> liane, RallyingPoint from, RallyingPoint to, bool isDriverSegment);

  Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination);

  Task<LianeDisplay> Display(LatLng pos, LatLng pos2);

  Task UpdateAllGeometries();
}