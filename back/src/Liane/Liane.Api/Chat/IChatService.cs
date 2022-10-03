using System.Collections.Immutable;
using System.Threading.Tasks;

namespace Liane.Api.Chat;

public interface IChatService
{
    public Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId);
    
    public Task<ImmutableList<ChatMessage>> GetGroupConversation(string groupId);
}