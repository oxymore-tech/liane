using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Chat;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

[TestFixture(Category = "Integration")]
public sealed class ChatServiceImplTest : BaseServiceLayerTest
{
  private IChatService testedService;

  protected override void InitService(IMongoDatabase db)
  {
    testedService = new ChatServiceImpl(db);
  }

  [Test]
  public async Task TestPagination()
  {
    var conversation = Fakers.ConversationFaker.Generate();
    var author = conversation.Members[0].User.Id;
    const int messageCount = 12;
    await testedService.Create(conversation, author);
    var messages = Fakers.MessageFaker.Generate(messageCount);
    foreach (var message in messages)
    {
      await testedService.SaveMessageInGroup(message, conversation.Id, author);
    }

    const int limit = 8;
    // Make sure our cursor is after 1st message date 
    Thread.Sleep(1);
    var firstPage = await testedService.GetGroupMessages(
      new Pagination<DatetimeCursor>(DatetimeCursor.Now(), limit),
      conversation.Id);

    Assert.AreEqual(limit, firstPage.Data.Count);
    Assert.NotNull(firstPage.NextCursor);

    var secondPage = await testedService.GetGroupMessages(
      new Pagination<DatetimeCursor>(firstPage.NextCursor, limit),
      conversation.Id);
    
    Assert.AreEqual(messageCount - limit, secondPage.Data.Count);
    Assert.IsNull(secondPage.NextCursor);
    
    Assert.IsEmpty(firstPage.Data.Intersect(secondPage.Data).ToImmutableList());
  }

  [TearDown]
  public void ClearTestedCollections()
  {
    DropTestedCollection<ConversationGroup>();
    DropTestedCollection<ChatMessage>();
  }
}