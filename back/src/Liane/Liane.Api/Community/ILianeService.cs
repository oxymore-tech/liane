using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public interface ILianeService
{
  Task<ImmutableList<LianeMatch>> List();
  Task<LianeRequest> Create(LianeRequest request);

  Task<Liane> Join(Ref<LianeRequest> mine, Ref<LianeRequest> foreign);
  Task<bool> Leave(Ref<Liane> liane);

  Task<PaginatedResponse<ChatMessage>> GetMessages(Ref<Liane> liane) => GetMessages(liane, Pagination.Empty);
  Task<PaginatedResponse<ChatMessage>> GetMessages(Ref<Liane> liane, Pagination pagination);
  Task<ChatMessage> SendMessage(Ref<Liane> liane, string message);

  Task<Liane> ReadAndGetLiane(Ref<Liane> id, Ref<User.User> user, DateTime timestamp);
  Task<ImmutableList<Ref<Liane>>> GetUnreadLianes(Ref<User.User> user);
}