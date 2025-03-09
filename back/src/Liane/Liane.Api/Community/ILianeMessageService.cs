using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public interface ILianeMessageService
{
  Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Liane> liane) => GetMessages(liane, Pagination.Empty);
  Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Liane> liane, Pagination pagination);
  Task<LianeMessage?> SendMessage(Ref<Liane> liane, MessageContent content, DateTime? at = null);
  Task MarkAsRead(Ref<Liane> liane, DateTime timestamp);
  Task<ImmutableDictionary<Ref<LianeRequest>, int>> GetUnreadLianes();
}