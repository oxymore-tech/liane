using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;

namespace Liane.Api.Trip;

public interface ILianeService : ICrudEntityService<LianeRequest, Liane>
{
  Task<PaginatedResponse<Liane>> List(Filter filter, Pagination pagination);
  Task<PaginatedResponse<Liane>> ListForCurrentUser(Pagination pagination);
  Task<PaginatedResponse<Liane>> ListForMemberUser(string userId, Pagination pagination);
}