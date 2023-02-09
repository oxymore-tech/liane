using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Chat;

public interface IChatService : ICrudEntityService<ConversationGroup>
{
    Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId, Ref<User.User> author);
    Task<ImmutableList<ChatMessage>> GetGroupConversation(string groupId);
    
    /** New methods **/

    Task<PaginatedResponse<ChatMessage, DatetimeCursor>> GetGroupMessages(PaginatedRequestParams<DatetimeCursor> pagination, Ref<ConversationGroup> group);

    Task<ConversationGroup> ReadAndGetConversation(Ref<ConversationGroup> group, Ref<Api.User.User> user, DateTime timestamp);


}