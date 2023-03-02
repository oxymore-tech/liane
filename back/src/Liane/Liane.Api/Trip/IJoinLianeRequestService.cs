using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface IJoinLianeRequestService : ICrudEntityService<JoinLianeRequest>
{
  Task<Liane> AcceptJoinRequest(Ref<User.User> userId, Ref<JoinLianeRequest> request);
  Task RefuseJoinRequest(Ref<User.User> userId, Ref<JoinLianeRequest> request);
  Task<PaginatedResponse<JoinLianeRequestDetailed>> ListUserRequests(Ref<User.User> fromUser, Pagination pagination);
  Task<PaginatedResponse<JoinLianeRequest>> ListLianeRequests(Ref<Liane> liane, Pagination pagination);
  Task<JoinLianeRequestDetailed> GetDetailedRequest(Ref<JoinLianeRequest> request);
}