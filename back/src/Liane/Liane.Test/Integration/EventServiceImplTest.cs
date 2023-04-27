using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Service.Internal.Event;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class EventServiceImplTest : BaseIntegrationTest
{
  private EventDispatcher eventDispatcher = null!;
  private ILianeService lianeService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    eventDispatcher = ServiceProvider.GetRequiredService<EventDispatcher>();
    lianeService = ServiceProvider.GetRequiredService<ILianeService>();
  }

  [Test]
  public async Task ShouldFindJoinLianeEvent()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    var liane = await lianeService.Create(new LianeRequest(null, DateTime.Now, null, 4, LabeledPositions.BlajouxParking, LabeledPositions.Florac), userA.Id);

    var joinRequest = new LianeEvent.JoinRequest(liane.Id, userB.Id, LabeledPositions.BlajouxParking, LabeledPositions.Florac, 2, false, "Hey !");
    await eventDispatcher.Dispatch(joinRequest);

    await eventDispatcher.DispatchAnswer(joinRequest, Answer.Accept);

    var actual = await lianeService.Get(liane.Id);

    CollectionAssert.AreEquivalent(actual.Members.Select(m => m.User.Id), ImmutableList.Create(userA.Id, userB.Id));
  }
}