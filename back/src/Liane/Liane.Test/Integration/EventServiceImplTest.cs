using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

public class EventServiceImplTest : BaseIntegrationTest
{
  private IEventService testedService;
  private ILianeService lianeService;
  protected override void Setup(IMongoDatabase db)
  {
    testedService = ServiceProvider.GetRequiredService<IEventService>();
    lianeService = ServiceProvider.GetRequiredService<ILianeService>();
  }

  protected override void SetupServices(IServiceCollection services)
  {
    services.AddService(Moq.Mock.Of<IHubService>());
    services.AddService<UserServiceImpl>();
    services.AddService<ChatServiceImpl>();
    services.AddService<LianeServiceImpl>();
    services.AddService<EventDispatcher>();
    services.AddService<EventServiceImpl>();
    services.AddService<LianeMemberAcceptedHandler>();
  }

  private async Task CreateLiane(Ref<Api.Trip.Liane> liane, Ref<User> user)
  {
    var departureTime = DateTime.Now.Date.AddDays(1).AddHours(9);

    var lianeMembers = ImmutableList.Create(
      new LianeMember(user.Id, LabeledPositions.Cocures, LabeledPositions.Mende, false, 3)
    );

    await Db.GetCollection<LianeDb>()
      .InsertOneAsync(new LianeDb(liane.Id, user.Id,  DateTime.Now, departureTime, null, lianeMembers, new Driver(user.Id, true)));
  }

  [Test]
  public async Task TestNewMember()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    var lianeId = ObjectId.GenerateNewId().ToString();
    var currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    currentContext.SetCurrentUser(userB);
    await CreateLiane(lianeId, userB.Id);
    var joinRequestLianeEvent = new LianeEvent.JoinRequest(lianeId ,LabeledPositions.Cocures, LabeledPositions.Mende, -1, false, "");
    currentContext.SetCurrentUser(userA);
    var joinEvent = await testedService.Create(joinRequestLianeEvent);
    var newMemberLianeEvent = new LianeEvent.MemberAccepted(lianeId , userA.Id, LabeledPositions.Cocures, LabeledPositions.Mende, -1, false);
    currentContext.SetCurrentUser(userB);
    var newMemberEvent = await testedService.Answer(joinEvent.Id!, newMemberLianeEvent);
    
    Assert.AreEqual(joinEvent.CreatedBy.Id,  userA.Id);
    
    // Assert original id points to latest event
    Assert.ThrowsAsync<ResourceNotFoundException>(() => testedService.Get(joinEvent.Id!));
    var createdEvent = await testedService.Get(newMemberEvent.Id!);
    Assert.IsInstanceOf<LianeEvent.MemberAccepted>(createdEvent.LianeEvent);
    Assert.AreEqual(createdEvent.CreatedBy.Id,  userB.Id);
    
    // Assert member was added to liane
    var updatedLiane = await lianeService.Get(lianeId);
    Assert.AreEqual(2, updatedLiane.Members.Count);

  }
}