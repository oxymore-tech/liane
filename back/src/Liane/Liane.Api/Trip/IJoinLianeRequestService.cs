using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface IJoinLianeRequestService : ICrudEntityService<JoinLianeRequest>
{
  Task<Liane> AcceptJoinRequest(Ref<User.User> userId, Ref<JoinLianeRequest> request);
  Task RefuseJoinRequest(Ref<User.User> userId, Ref<JoinLianeRequest> request);
}