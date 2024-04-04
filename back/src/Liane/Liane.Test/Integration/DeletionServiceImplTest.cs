using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Auth;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class DeletionServiceImplTest : BaseIntegrationTest
{
  private IDeleteAccountService testedService = null!;
  private MockCurrentContext currentContext = null!;
  private ITripService tripService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    testedService = ServiceProvider.GetRequiredService<DeleteAccountServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    tripService = ServiceProvider.GetRequiredService<TripServiceImpl>();
  }

  [Test]
  public async Task ShouldDeleteAccount()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    var baseLianesRequests = TripServiceImplTest.CreateBaseLianeRequests();

    foreach (var t in baseLianesRequests)
    {
      currentContext.SetCurrentUser(userA);
      var liane = await tripService.Create(t, userA.Id);
      currentContext.SetCurrentUser(userB);
      await tripService.AddMember(liane, new LianeMember(userB.Id, liane.WayPoints.First().RallyingPoint.Id!, liane.WayPoints.Last().RallyingPoint.Id!, -1));
    }

    foreach (var t in baseLianesRequests)
    {
      currentContext.SetCurrentUser(userA);
      var liane = await tripService.Create(t with { Recurrence = DayOfWeekFlag.Friday | DayOfWeekFlag.Monday }, userA.Id);
      currentContext.SetCurrentUser(userB);
      await tripService.AddMember(liane, new LianeMember(userB.Id, liane.WayPoints.First().RallyingPoint.Id!, liane.WayPoints.Last().RallyingPoint.Id!, -1));
    }

    currentContext.SetCurrentUser(userA);
    await testedService.DeleteCurrent();

    currentContext.SetCurrentUser(userB);
    var list = await tripService.List(new LianeFilter { ForCurrentUser = true, States = new[] { LianeState.NotStarted } }, new Pagination());

    CollectionAssert.IsEmpty(list.Data);
  }
}