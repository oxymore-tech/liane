using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;

namespace Liane.Api.Trip;

public interface ILianeService : ICrudEntityService<LianeRequest, Liane>
{
  Task<PaginatedResponse<Liane, DatetimeCursor>> List(Filter filter, Pagination<DatetimeCursor> pagination);
  Task<PaginatedResponse<Liane, DatetimeCursor>> ListForCurrentUser(Pagination<DatetimeCursor> pagination);
  Task<PaginatedResponse<Liane, DatetimeCursor>> ListForMemberUser(string userId, Pagination<DatetimeCursor> pagination);
}