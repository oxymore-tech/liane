using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeService : ICrudEntityService<LianeRequest, Liane>
{
  Task<PaginatedResponse<Liane, DatetimeCursor>> ListForMemberUser(Ref<User.User> user, PaginatedRequestParams<DatetimeCursor> pagination);
}