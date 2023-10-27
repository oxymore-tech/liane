using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.User;
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
  private ILianeService lianeService = null!;
  protected override void Setup(IMongoDatabase db)
  {
    testedService = ServiceProvider.GetRequiredService<DeleteAccountServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    lianeService = ServiceProvider.GetRequiredService<LianeServiceImpl>();
  }
  
  [Test]
  public async Task ShouldDeleteAccount()
  {
    var userA = Fakers.FakeDbUsers[0];
    var userB = Fakers.FakeDbUsers[1];
    var baseLianesRequests = LianeServiceImplTest.CreateBaseLianeRequests();
   
    foreach (var t in baseLianesRequests)
    {
      currentContext.SetCurrentUser(userA);
      var liane = await lianeService.Create(t, userA.Id);
      currentContext.SetCurrentUser(userB);
      await lianeService.AddMember(liane, new LianeMember(userB.Id, liane.WayPoints.First().RallyingPoint.Id!, liane.WayPoints.Last().RallyingPoint.Id!, -1));
    }
    
    foreach (var t in baseLianesRequests)
    {
      currentContext.SetCurrentUser(userA);
      var liane = await lianeService.Create(t with{Recurrence = DayOfTheWeekFlag.Create(new HashSet<DayOfWeek>() { DayOfWeek.Friday , DayOfWeek.Monday })}, userA.Id);
      currentContext.SetCurrentUser(userB);
      await lianeService.AddMember(liane, new LianeMember(userB.Id, liane.WayPoints.First().RallyingPoint.Id!, liane.WayPoints.Last().RallyingPoint.Id!, -1));
    }

    currentContext.SetCurrentUser(userA);
    await testedService.DeleteCurrent();
    
    currentContext.SetCurrentUser(userB);
    var list = await lianeService.List(new LianeFilter { ForCurrentUser = true, States = new[] { LianeState.NotStarted } }, new Pagination());
    
    CollectionAssert.IsEmpty(list.Data);
    
  }
  
}