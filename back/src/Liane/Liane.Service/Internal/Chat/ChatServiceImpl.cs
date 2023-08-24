using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.User;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Chat;

public sealed class ChatServiceImpl : MongoCrudEntityService<ConversationGroup>, IChatService
{
  private readonly IUserService userService;
  private readonly IPushService pushService;

  public ChatServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext, IUserService userService, IPushService pushService) : base(mongo,
    currentContext)
  {
    this.userService = userService;
    this.pushService = pushService;
  }

  public async Task AddMember(Ref<ConversationGroup> id, Ref<Api.User.User> user)
  {
    await Mongo.GetCollection<ConversationGroup>()
      .UpdateOneAsync(g => g.Id == id.Id,
        Builders<ConversationGroup>.Update.Push(g => g.Members, new GroupMemberInfo(user, DateTime.UtcNow))
      );
  }

  public async Task<bool> RemoveMember(Ref<ConversationGroup> id, Ref<Api.User.User> user)
  {
    await Mongo.GetCollection<ConversationGroup>()
      .UpdateOneAsync(g => g.Id == id.Id,
        Builders<ConversationGroup>.Update.PullFilter(g => g.Members, m => m.User == user.Id)
      );
    var deleteOneAsync = await Mongo.GetCollection<ConversationGroup>()
      .DeleteOneAsync(g => g.Id == id.Id && g.Members.Count <= 1);
    return deleteOneAsync.DeletedCount > 0;
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

  public async Task ReadConversation(Ref<ConversationGroup> group, Ref<Api.User.User> user, DateTime timestamp)
  {
    // Retrieve conversation and user's membership data
    var conversationGroup = await Get(group);
    var userMembershipIndex = conversationGroup.Members.FindIndex(m => m.User.Id == user.Id);
    if (userMembershipIndex < 0) throw new NullReferenceException();

    // Update Member's last connection
    await Mongo.GetCollection<ConversationGroup>()
      .UpdateOneAsync<ConversationGroup>(
        g => g.Id == group.Id,
        Builders<ConversationGroup>.Update.Set(g => g.Members[userMembershipIndex].LastReadAt, timestamp)
      );
  }

  public async Task<ImmutableList<Ref<ConversationGroup>>> GetUnreadConversationsIds(Ref<Api.User.User> user)
  {
    // Get conversations ids where user's last read is before the latest message
    var userConversations = await Mongo.GetCollection<ConversationGroup>()
      .Find(Builders<ConversationGroup>.Filter.ElemMatch(c => c.Members, m => m.User == user.Id))
      .ToListAsync();
    return userConversations
      .Where(c =>
      {
        var lastReadAt = c.Members.First(m => m.User.Id == user.Id).LastReadAt;
        return lastReadAt is null || lastReadAt.Value < c.LastMessageAt;
      })
      .Select(c => (Ref<ConversationGroup>)c.Id!).ToImmutableList();
  }

  public Task PostEvent(LianeEvent lianeEvent)
  {
    throw new NotImplementedException();
  }

  public Task PostAnswer(Ref<Notification> id, Answer answer)
  {
    throw new NotImplementedException();
  }

  public async Task<ChatMessage> SaveMessageInGroup(ChatMessage message, string groupId, Ref<Api.User.User> author)
  {
    var createdAt = DateTime.UtcNow;
    var sent = message with { Id = ObjectId.GenerateNewId().ToString(), CreatedBy = author.Id, CreatedAt = createdAt };
    await Mongo.GetCollection<DbChatMessage>()
      .InsertOneAsync(new DbChatMessage(sent.Id!, groupId, sent.CreatedBy, createdAt, sent.Text));
    var conversation = await Mongo.GetCollection<ConversationGroup>()
      .FindOneAndUpdateAsync<ConversationGroup>(c => c.Id == groupId,
        Builders<ConversationGroup>.Update.Set(c => c.LastMessageAt, createdAt),
        new FindOneAndUpdateOptions<ConversationGroup> { ReturnDocument = ReturnDocument.After }
      );
    // Send notification asynchronously to other conversation members
    var receivers = conversation!.Members.Select(m => m.User)
      .Where(u => u != author)
      .ToImmutableList();
    await pushService.SendChatMessage(receivers, groupId, sent);
    return sent;
  }

  public async Task<PaginatedResponse<ChatMessage>> GetGroupMessages(Pagination pagination, Ref<ConversationGroup> group)
  {
    // Get messages in DESC order
    var messages = await Mongo.Paginate<DbChatMessage, Cursor.Time>(
      pagination,
      m => m.CreatedAt,
      Builders<DbChatMessage>.Filter.Where(m => m.Group == group.Id),
      false
    );
    return messages.Select(MapMessage);
  }

  protected override Task<ConversationGroup> ToDb(ConversationGroup inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return Task.FromResult(inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy });
  }

  private static ChatMessage MapMessage(DbChatMessage m)
  {
    return new ChatMessage(m.Id, m.CreatedBy, m.CreatedAt, m.Text);
  }

  protected override async Task<ConversationGroup> MapEntity(ConversationGroup dbRecord)
  {
    var conversation = await base.MapEntity(dbRecord);
    var users = await conversation.Members.SelectAsync(async m => m with { User = await userService.Get(m.User) });
    return conversation with { Members = users };
  }
}
