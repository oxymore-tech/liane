using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface ILianeRequestService : IEventListener<LianeEvent.JoinRequest>
{
  Task<PaginatedResponse<JoinLianeRequest>> List(Pagination pagination);

  Task<JoinLianeRequest> Get(Ref<Notification> id);

  Task Delete(Ref<Notification> id);
}