using System.Threading.Tasks;
using Liane.Api.Trip;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class RallyingPointServiceImplTest : BaseIntegrationTest
{
  private IRallyingPointService testedService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    testedService = ServiceProvider.GetRequiredService<IRallyingPointService>();
  }

  [Test]
  public async Task ShoudList()
  {
    var actual = await testedService.List(null);
    Assert.IsNotEmpty(actual);
  }
}