using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Chat;

public sealed class ChatServiceImpl : MongoCrudEntityService<ConversationGroup>, IChatService
{
  public ChatServiceImpl(IMongoDatabase mongo) : base(mongo)
  {
  }

  public async Task<ConversationGroup> ReadAndGetConversation(Ref<ConversationGroup> group, Ref<Api.User.User> user, DateTime timestamp)
  {
    // Retrieve conversation and user's membership data
    var conversationGroup = await Get(group);
    var userMembershipIndex = conversationGroup.Members.FindIndex(m => m.User == user);
    if (userMembershipIndex < 0) throw new NullReferenceException();

    // Update Member's last connection and return
    return await Mongo.GetCollection<ConversationGroup>()
      .FindOneAndUpdateAsync(
        g => g.Id == group.Id,
        Builders<ConversationGroup>.Update.Set(g => g.Members[userMembershipIndex].LastReadAt, timestamp)
      );
  }

  public async Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId, Ref<Api.User.User> author)
  {
    var createdAt = DateTime.UtcNow;
    var sent = message with { Id = ObjectId.GenerateNewId().ToString(), CreatedBy = author.Id, CreatedAt = createdAt };
    await Mongo.GetCollection<DbChatMessage>()
      .InsertOneAsync(new DbChatMessage(sent.Id, groupId, sent.CreatedBy, createdAt, sent.Text));
    return sent;
  }

  public async Task<ImmutableList<ChatMessage>> GetGroupConversation(string groupId)
  {
    var sort = Builders<DbChatMessage>.Sort.Ascending(m => m.CreatedAt);
    var collection = Mongo.GetCollection<DbChatMessage>();
    return (await collection.FindAsync(g => g.GroupId == groupId, new FindOptions<DbChatMessage> { Sort = sort }))
      .ToEnumerable()
      .Select(m => new ChatMessage(m.Id.ToString(), m.CreatedBy, m.CreatedAt, m.Text))
      .ToImmutableList();
  }

  public async Task<PaginatedResponse<ChatMessage>> GetGroupMessages(Pagination pagination, Ref<ConversationGroup> group)
  {
    // Get messages in DESC order 
    var messages = await Mongo.Paginate(
      pagination,
      m => m.CreatedAt,
      Builders<DbChatMessage>.Filter.Where(m => m.GroupId == group.Id),
      false
    );
    return messages.Select(ToOutputDto);
  }

  protected override ConversationGroup ToDb(ConversationGroup inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy };
  }

  private ChatMessage ToOutputDto(DbChatMessage m)
  {
    return new ChatMessage(m.Id, m.CreatedBy, m.CreatedAt, m.Text);
  }
}