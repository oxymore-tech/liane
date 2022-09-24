using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Driver;

namespace Liane.Service.Internal.Chat;

public class ChatServiceImpl : IChatService
{
    private readonly IMongoDatabase mongo;

    public ChatServiceImpl(MongoSettings settings)
    {
        mongo = settings.GetDatabase();
    }

    public Task SaveMessageInGroup(ChatMessage message, string groupId)
    {
        var update = Builders<DbGroupConversation>.Update.AddToSet(g => g.Messages, message);
        var filter = Builders<DbGroupConversation>.Filter.Eq(g => g.GroupId, groupId);

        var result = mongo.GetCollection<DbGroupConversation>().FindOneAndUpdateAsync(filter, update);
        
        return result;
    }

    public async Task<ImmutableList<ChatMessage>> GetGroupConversation(string groupId)
    {
        var result = (await mongo.GetCollection<DbGroupConversation>().FindAsync(g => g.GroupId == groupId)).ToList();

        if (result.Any())
        {
            var r = result.Select(g => g.Messages).First();
            r.Reverse();
            return r.ToImmutableList();
        }

        var list = new List<ChatMessage>();
        await mongo.GetCollection<DbGroupConversation>().InsertOneAsync(new DbGroupConversation(groupId, list));
        
        return list.ToImmutableList();
    }
}