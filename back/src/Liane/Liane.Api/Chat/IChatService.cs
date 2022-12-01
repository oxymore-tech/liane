using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Chat;

public interface IChatService
{
    Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId);
    Task<ImmutableList<ChatMessage>> GetGroupConversation(string groupId);
}