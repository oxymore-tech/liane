using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Trip;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

[TestFixture(Category = "Integration")]
public class LianeServiceImplTest : BaseServiceLayerTest
{
  private ILianeService testedService;

  protected override void InitService(IMongoDatabase db)
  {
    testedService = new LianeServiceImpl(db, Moq.Mock.Of<IRoutingService>());
  }

  [Test]
  public async Task TestListAccessLevel()
  {
    var userA = Fakers.FakeDbUsers[0].Id.ToString();
    var userB = Fakers.FakeDbUsers[0].Id.ToString();
    const int lianesACount = 3;
    const int lianesBCount = 1;
    var lianesA = Fakers.LianeRequestFaker.Generate(lianesACount);
    var lianeB = Fakers.LianeRequestFaker.Generate();

    await testedService.Create(lianeB, userB);
    foreach (var l in lianesA)
    {
      await testedService.Create(l, userA);
    }

    var resultsA = await testedService.ListForMemberUser(userA, new PaginatedRequestParams<DatetimeCursor>());
    var resultsB = await testedService.ListForMemberUser(userB, new PaginatedRequestParams<DatetimeCursor>());
    Assert.AreEqual(lianesACount, resultsA.Data.Count);

    Assert.AreEqual(lianesBCount, resultsB.Data.Count);
  }

  [TearDown]
  public void ClearTestedCollections()
  {
    DropTestedCollection<Api.Trip.Liane>();
  }
}