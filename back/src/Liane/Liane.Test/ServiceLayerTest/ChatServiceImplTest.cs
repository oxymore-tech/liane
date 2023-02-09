using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

[TestFixture]
public class ChatServiceImplTest : BaseServiceLayerTest
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
    var author = Fakers.FakeDbUsers[0].Id.ToString();
    const int messageCount = 12;
    await testedService.Create(conversation, author);
    var messages = Fakers.MessageFaker.Generate(messageCount);
    foreach (var message in messages)
    {
      await testedService.SaveMessageInGroup(message, conversation.Id, author);
    }

    const int limit = 8;
    var firstPage = await testedService.GetGroupMessages(
      new PaginatedRequestParams<DatetimeCursor>(DatetimeCursor.Now(), limit), 
      conversation.Id);
    
    Assert.AreEqual(limit, firstPage.Data.Count);
    Assert.True(firstPage.HasNext);
    
    var secondPage = await testedService.GetGroupMessages(
      new PaginatedRequestParams<DatetimeCursor>(firstPage.NextCursor, limit), 
      conversation.Id);
    
    Assert.AreEqual(messageCount - limit, secondPage.Data.Count);
    Assert.False(secondPage.HasNext);
  }

  [TearDown]
  public void ClearTestedCollections()
  {
    DropTestedCollection<ConversationGroup>();
    DropTestedCollection<ChatMessage>();
  }
  
}