using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface ILianeRequestService
{
  Task<PaginatedResponse<JoinLianeRequest>> List(Pagination pagination);

  Task<JoinLianeRequest> Get(Ref<Event> id);

  Task Delete(Ref<Event> id);
}
