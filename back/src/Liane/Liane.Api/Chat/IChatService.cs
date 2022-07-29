using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Web.Hubs;

namespace Liane.Api.Chat;

public interface IChatService
{
    public Task SaveMessageInGroup(ChatMessage message, string groupId);
    public Task<ImmutableList<ChatMessage>> GetGroupConversation(string groupId);
}