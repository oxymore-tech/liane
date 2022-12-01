using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Chat;

public sealed class ChatServiceImpl : IChatService
{
    private readonly IMongoDatabase mongo;
    private readonly ICurrentContext currentContext;

    public ChatServiceImpl(MongoSettings settings, ICurrentContext currentContext)
    {
        this.currentContext = currentContext;
        mongo = settings.GetDatabase();
    }

    public async Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId)
    {
        var createdAt = DateTime.UtcNow;
        var sent = message with { Id = ObjectId.GenerateNewId().ToString(), CreatedBy = currentContext.CurrentUser().Id, CreatedAt = createdAt };
        await mongo.GetCollection<DbChatMessage>()
            .InsertOneAsync(new DbChatMessage(new ObjectId(sent.Id), groupId, sent.CreatedBy, createdAt, sent.Text));
        return sent;
    }

    public async Task<ImmutableList<ChatMessage>> GetGroupConversation(string groupId)
    {
        var sort = Builders<DbChatMessage>.Sort.Ascending(m => m.CreatedAt);
        var collection = mongo.GetCollection<DbChatMessage>();
        return (await collection.FindAsync(g => g.GroupId == groupId, new FindOptions<DbChatMessage> { Sort = sort }))
            .ToEnumerable()
            .Select(m => new ChatMessage(m.Id.ToString(), m.CreatedBy, m.CreatedAt, m.Text))
            .ToImmutableList();
    }
}