using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Chat;

public interface IChatService : ICrudEntityService<ConversationGroup>
{
  Task AddMember(Ref<ConversationGroup> id, Ref<Auth.User> user);

  /**
   * Remove a member from a group
   * @param groupId the group id
   * @param user the user to remove
   * @return true if the conversation group has been removed (since only one user remains)
   */
  Task<bool> RemoveMember(Ref<ConversationGroup> group, Ref<Auth.User> user);

  Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId, Ref<Auth.User> author);
  Task<PaginatedResponse<ChatMessage>> GetGroupMessages(Pagination pagination, Ref<ConversationGroup> group);
  Task<ConversationGroup> ReadAndGetConversation(Ref<ConversationGroup> group, Ref<Api.Auth.User> user, DateTime timestamp);
  Task ReadConversation(Ref<ConversationGroup> group, Ref<Api.Auth.User> user, DateTime timestamp);
  Task<ImmutableList<Ref<ConversationGroup>>> GetUnreadConversationsIds(Ref<Api.Auth.User> user);
  Task Clear(IEnumerable<string> toDelete);
}