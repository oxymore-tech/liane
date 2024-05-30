using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public interface ILianeService
{
  Task<LianeRequest> Create(LianeRequest request);
  Task<LianeRequest> Update(Ref<LianeRequest> id, LianeRequest request);
  Task Delete(Ref<LianeRequest> id);
  Task<ImmutableList<LianeMatch>> List();

  Task<Liane> Get(Ref<Liane> id);
  Task<Liane> JoinNew(Ref<LianeRequest> mine, Ref<LianeRequest> foreign);
  Task<Liane> Join(Ref<LianeRequest> mine, Ref<Liane> liane);
  Task<Liane> Update(Ref<Liane> id, LianeUpdate liane);
  Task<bool> Leave(Ref<Liane> liane);
  Task<Liane> Get(Ref<Liane> liane);

  Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Liane> liane) => GetMessages(liane, Pagination.Empty);
  Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Liane> liane, Pagination pagination);
  Task<LianeMessage> SendMessage(Ref<Liane> liane, MessageContent content);

  Task<ImmutableDictionary<Ref<Liane>, int>> GetUnreadLianes();
}