using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public interface ILianeService
{
  Task<LianeRequest> Create(LianeRequest request);
  Task SetEnabled(Ref<LianeRequest> id, bool isEnabled);
  Task<ImmutableList<LianeMatch>> List();

  Task<Liane> JoinNew(Ref<LianeRequest> mine, Ref<LianeRequest> foreign);
  Task<Liane> Join(Ref<LianeRequest> mine, Ref<Liane> liane);
  Task<bool> Leave(Ref<Liane> liane);

  Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Liane> liane) => GetMessages(liane, Pagination.Empty);
  Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Liane> liane, Pagination pagination);
  Task<LianeMessage> SendMessage(Ref<Liane> liane, string message);

  Task<ImmutableDictionary<Ref<Liane>, int>> GetUnreadLianes();
}