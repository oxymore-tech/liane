using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture]
public sealed class EventServiceImplTest : BaseIntegrationTest
{
  private IEventService testedService = null!;
  private ILianeService lianeService = null!;

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
    services.AddService<EventServiceImpl>();
    services.AddService<LianeMemberAcceptedHandler>();
  }

  [Test]
  public async Task TestNewMember()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    var currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    currentContext.SetCurrentUser(userB);
    var liane = await lianeService.Create(new LianeRequest(null, DateTime.UtcNow, null, 3, LabeledPositions.Cocures, LabeledPositions.Mende));
    var joinRequestLianeEvent = new LianeEvent.JoinRequest(liane.Id, LabeledPositions.Cocures, LabeledPositions.Mende, -1, false, "");
    currentContext.SetCurrentUser(userA);
    var joinEvent = await testedService.Create(joinRequestLianeEvent);
    var newMemberLianeEvent = new LianeEvent.MemberAccepted(liane.Id, userA.Id, LabeledPositions.Cocures, LabeledPositions.Mende, -1, false);
    currentContext.SetCurrentUser(userB);
    var newMemberEvent = await testedService.Answer(joinEvent.Id!, newMemberLianeEvent);

    Assert.AreEqual(joinEvent.CreatedBy.Id, userA.Id);

    // Assert original id points to latest event
    Assert.ThrowsAsync<ResourceNotFoundException>(() => testedService.Get(joinEvent.Id!));
    var createdEvent = await testedService.Get(newMemberEvent.Id!);
    Assert.IsInstanceOf<LianeEvent.MemberAccepted>(createdEvent.LianeEvent);
    Assert.AreEqual(createdEvent.CreatedBy.Id, userB.Id);

    // Assert member was added to liane
    var updatedLiane = await lianeService.Get(liane.Id);
    Assert.AreEqual(2, updatedLiane.Members.Count);
  }
}