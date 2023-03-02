using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Notification;
using Liane.Service.Internal.User;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class ChatServiceImplTest : BaseIntegrationTest
{
  private IChatService testedService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    testedService = new ChatServiceImpl(db, Moq.Mock.Of<ISendNotificationService>(), new UserServiceImpl(db));
  }

  [Test]
  public async Task TestPagination()
  {
    var conversation = Fakers.ConversationFaker.Generate();
    var author = conversation.Members[0].User.Id;
    const int messageCount = 12;
    conversation = await CreateConversation(conversation, author, messageCount);

    const int limit = 8;
    // Make sure our cursor is after 1st message date 
    Thread.Sleep(1);
    var firstPage = await testedService.GetGroupMessages(
      new Pagination(Cursor.Now(), limit),
      conversation.Id!);

    Assert.AreEqual(limit, firstPage.Data.Count);
    Assert.NotNull(firstPage.Next);

    var secondPage = await testedService.GetGroupMessages(
      new Pagination(firstPage.Next, limit),
      conversation.Id!);

    Assert.AreEqual(messageCount - limit, secondPage.Data.Count);
    Assert.IsNull(secondPage.Next);

    Assert.IsEmpty(firstPage.Data.Intersect(secondPage.Data).ToImmutableList());
  }

  private async Task<ConversationGroup> CreateConversation(ConversationGroup dto, Ref<User> author, int messageCount)
  {
    var conversation1 = await testedService.Create(dto, author);
    if (messageCount <= 0)
    {
      return conversation1;
    }

    var messages = Fakers.MessageFaker.Generate(messageCount);
    foreach (var message in messages)
    {
      await testedService.SaveMessageInGroup(message, conversation1.Id!, author);
      await Task.Delay(10);
    }

    return conversation1;
  }


  [Test]
  public async Task TestReadConversation()
  {
    // Create mock conversations
    var conversation = Fakers.ConversationFaker.Generate();
    var author = conversation.Members[0].User.Id;
    var receiver = conversation.Members[1].User.Id;
    var convId = (await CreateConversation(conversation, author, 0)).Id!;
    var timestamp = DateTime.Parse("2023-02-01").ToUniversalTime();
    var updated = await testedService.ReadAndGetConversation(convId, receiver, timestamp);

    Assert.AreEqual(timestamp, updated.Members.FirstOrDefault(m => m.User.Id == receiver)?.LastReadAt);
    Assert.True(updated.Members.All(m => m.User is Ref<User>.Resolved));
  }

  [Test]
  public async Task TestGetUnreadConversations()
  {
    // Create mock conversations
    var conversation = Fakers.ConversationFaker.Generate();
    var author = conversation.Members[0].User.Id;
    var receiver = conversation.Members[1].User.Id;
    const int messageCount = 12;
    var conv1 = (await CreateConversation(conversation, author, messageCount)).Id!;
    var conv2 = (await CreateConversation(conversation, author, messageCount)).Id!;

    await testedService.ReadAndGetConversation(conv1, receiver, DateTime.Now);

    var receiversUnread = await testedService.GetUnreadConversationsIds(receiver);

    Assert.AreEqual(1, receiversUnread.Count);
    Assert.AreEqual(conv2, receiversUnread[0].Id);
  }
}