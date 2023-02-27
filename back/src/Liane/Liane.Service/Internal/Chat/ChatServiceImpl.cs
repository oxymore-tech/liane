using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Notification;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Chat;

public sealed class ChatServiceImpl : MongoCrudEntityService<ConversationGroup>, IChatService
{
  private readonly ISendNotificationService notificationService;
  private readonly IUserService userService;

  public ChatServiceImpl(IMongoDatabase mongo, ISendNotificationService notificationService, IUserService userService) : base(mongo)
  {
    this.notificationService = notificationService;
    this.userService = userService;
  }

  public async Task<ConversationGroup> ReadAndGetConversation(Ref<ConversationGroup> group, Ref<Api.User.User> user, DateTime timestamp)
  {
    // Retrieve conversation and user's membership data
    var conversationGroup = await Get(group);
    var userMembershipIndex = conversationGroup.Members.FindIndex(m => m.User == user);
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
          "$Members.User"
        }),
      new BsonDocument("$lt",
        new BsonArray
        {
          new BsonDocument("$min", "$Members.LastReadAt"),
          "$LastMessageAt"
        })
    }))).SelectAsync<ConversationGroup, Ref<ConversationGroup>>( g => Task.FromResult((Ref<ConversationGroup>)g.Id!));

  }

  public async Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId, Ref<Api.User.User> author)
  {
    var createdAt = DateTime.UtcNow;
    var sent = message with { Id = ObjectId.GenerateNewId().ToString(), CreatedBy = author.Id, CreatedAt = createdAt };
    await Mongo.GetCollection<DbChatMessage>()
      .InsertOneAsync(new DbChatMessage(sent.Id, groupId, sent.CreatedBy, createdAt, sent.Text));
    await Mongo.GetCollection<ConversationGroup>()
      .UpdateOneAsync(c => c.Id == groupId,
        Builders<ConversationGroup>.Update.Set(c => c.LastMessageAt, createdAt)
      );
    // Send push notification asynchronously to other conversation members
    var _ = Task.Run(async () =>
    {
      var conversation = await ResolveRef<ConversationGroup>(groupId);
      Parallel.ForEach(conversation!.Members, info =>
      {
        if (info.User != author) notificationService.SendTo(info.User, nameof(ChatMessage), sent);
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