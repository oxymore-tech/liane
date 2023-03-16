using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Chat;

public sealed class ChatServiceImpl : MongoCrudEntityService<ConversationGroup>, IChatService
{
  private readonly IUserService userService;
  private readonly IHubService hubService;

  public ChatServiceImpl(IMongoDatabase mongo, IUserService userService, IHubService hubService) : base(mongo)
  {
    this.userService = userService;
    this.hubService = hubService;
  }

  public async Task<ConversationGroup> ReadAndGetConversation(Ref<ConversationGroup> group, Ref<Api.User.User> user, DateTime timestamp)
  {
    // Retrieve conversation and user's membership data
    var conversationGroup = await Get(group);
    var userMembershipIndex = conversationGroup.Members.FindIndex(m => m.User.Id == user.Id);
    if (userMembershipIndex < 0) throw new NullReferenceException();

    // Update Member's last connection and return
    var conversation = await Mongo.GetCollection<ConversationGroup>()
      .FindOneAndUpdateAsync<ConversationGroup>(
        g => g.Id == group.Id,
        Builders<ConversationGroup>.Update.Set(g => g.Members[userMembershipIndex].LastReadAt, timestamp),
        new FindOneAndUpdateOptions<ConversationGroup> { ReturnDocument = ReturnDocument.After }
      );
    var members = await userService.GetMany(conversation.Members.Select(m => m.User).ToImmutableList());
    return conversation with { Members = conversation.Members.Select(m => m with { User = members[m.User.Id] }).ToImmutableList() };
  }

  public async Task<ImmutableList<Ref<ConversationGroup>>> GetUnreadConversationsIds(Ref<Api.User.User> user)
  {
    // Get conversations ids where user's last read is before the latest message
    return await Mongo.GetCollection<ConversationGroup>().Find(new BsonDocument("$expr", new BsonDocument("$and", new BsonArray
    {
      new BsonDocument("$in",
        new BsonArray
        {
          new ObjectId(user.Id),
          "$members.user"
        }),
      new BsonDocument("$lt",
        new BsonArray
        {
          new BsonDocument("$min", "$members.lastReadAt"),
          "$lastMessageAt"
        })
    }))).SelectAsync<ConversationGroup, Ref<ConversationGroup>>(g => Task.FromResult((Ref<ConversationGroup>)g.Id!));
  }

  public async Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId, Ref<Api.User.User> author)
  {
    var createdAt = DateTime.UtcNow;
    var sent = message with { Id = ObjectId.GenerateNewId().ToString(), CreatedBy = author.Id, CreatedAt = createdAt };
    await Mongo.GetCollection<DbChatMessage>()
      .InsertOneAsync(new DbChatMessage(sent.Id, groupId, sent.CreatedBy, createdAt, sent.Text));
    var conversation = await Mongo.GetCollection<ConversationGroup>()
      .FindOneAndUpdateAsync<ConversationGroup>(c => c.Id == groupId,
        Builders<ConversationGroup>.Update.Set(c => c.LastMessageAt, createdAt),
        new FindOneAndUpdateOptions<ConversationGroup> { ReturnDocument = ReturnDocument.After }
      );
    // Send notification asynchronously to other conversation members
    var _ = Task.Run(() =>
    {
      Parallel.ForEach(conversation!.Members, async info =>
      {
        if (info.User == author) return;
        if (await hubService.TrySendChatMessage(info.User, groupId, sent))
        {
          return;
        }
        // User is not connected so send detailed notification  
        // var authorUser = await userService.Get(author);
        //TODO await notificationService.SendTo(info.User, nameof(NewConversationMessage), new NewConversationMessage(groupId, authorUser, sent));
      });
    });
    return sent;
  }

  public async Task<PaginatedResponse<ChatMessage>> GetGroupMessages(Pagination pagination, Ref<ConversationGroup> group)
  {
    // Get messages in DESC order 
    var messages = await Mongo.Paginate(
      pagination,
      m => m.CreatedAt,
      Builders<DbChatMessage>.Filter.Where(m => m.Group == group.Id),
      false
    );
    return messages.Select(MapMessage);
  }

  protected override ConversationGroup ToDb(ConversationGroup inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy };
  }

  private ChatMessage MapMessage(DbChatMessage m)
  {
    return new ChatMessage(m.Id, m.CreatedBy, m.CreatedAt, m.Text);
  }
}