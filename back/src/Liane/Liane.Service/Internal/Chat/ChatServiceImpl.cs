using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Chat;

public sealed class ChatServiceImpl : IChatService
{
    private readonly IMongoDatabase mongo;

    public ChatServiceImpl(MongoSettings settings)
    {
        mongo = settings.GetDatabase();
    }

    public Task SaveMessageInGroup(ChatMessage message, string groupId)
    {
        var result = mongo.GetCollection<DbChatMessage>()
            .InsertOneAsync(new DbChatMessage(ObjectId.GenerateNewId(), groupId, message.CreatedBy!, DateTime.UtcNow, message.Text));
        return result;
    }

    public async Task<ImmutableList<ChatMessage>> GetGroupConversation(string groupId)
    {
        var collection = mongo.GetCollection<DbChatMessage>();
        return (await collection.FindAsync(g => g.GroupId == groupId))
            .ToEnumerable()
            .Select(m => new ChatMessage(m.Id.ToString(), m.CreatedBy, m.CreatedAt, m.Text))
            .ToImmutableList();
    }
}