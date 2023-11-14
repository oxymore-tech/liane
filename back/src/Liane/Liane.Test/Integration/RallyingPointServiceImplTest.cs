using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Test.Util;
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
    var actual = await testedService.List(new RallyingPointFilter());
    Assert.IsNotEmpty(actual.Data);
  }
  
  [Test]
  public async Task ShouldSnap()
  {
    var actual = await testedService.Snap(new LatLng(44.352838, 3.524227), 10000);
    Assert.AreEqual(LabeledPositions.QuezacParking, actual);
    
    var actual2 = await testedService.SnapViaRoute(new LatLng(44.352838, 3.524227), 10000);
    Assert.AreEqual(LabeledPositions.QuezacParking, actual2);
  }

  [Test]
  public async Task ShouldDeleteUnusedOnly()
  {
    var (_, _, originalPoints, originalCount) = await testedService.List(new RallyingPointFilter{Limit = 100});
    var lianeService = ServiceProvider.GetRequiredService<ILianeService>();
    await lianeService.Create(new LianeRequest(null, DateTime.Now.AddHours(1), null, 1, originalPoints[0], originalPoints[1]));

    var idsToDelete = originalPoints.Skip(2).Select(r => (Ref<RallyingPoint>)r);
    var deleted = await testedService.DeleteMany(idsToDelete);
    Assert.AreEqual(originalCount-2, deleted);
    var (_, _, newPoints, newCount) = await testedService.List(new RallyingPointFilter{Limit = 100});
    Assert.AreEqual(2, newCount);
    CollectionAssert.AreEquivalent(newPoints, originalPoints.Take(2));

  }
  
  [Test]
  public async Task ShouldImport()
  {
    await testedService.Insert(Array.Empty<RallyingPoint>(), true); // clear all 
    var csv = await LoadCsv();
    await using var stream = AssertExtensions.ReadTestResource("test-points.csv", GetType().Assembly);
    using var context = await testedService.ImportCsv();
    await context.Write(stream, Encoding.UTF8);
    var expected = csv.TrimEnd().Split("\n").Skip(1).ToArray();
    var actual = await testedService.List(new RallyingPointFilter{Limit = expected.Length});
    Assert.AreEqual(expected.Length, actual.TotalCount);
    var expectedIds = expected.Select(line => line.Substring(0, line.IndexOf(",", StringComparison.Ordinal)));
    var actualIds = actual.Data.Select(r => r.Id);
    CollectionAssert.AreEquivalent(expectedIds, actualIds);
    
  }
  
  [Test]
  public async Task ShouldExport()
  {
    var csv = await LoadCsv();
    using var context = await testedService.ExportCsv(new RallyingPointFilter());
    await using var stream = await context.GetStream();
    using var reader = new StreamReader(stream, Encoding.Unicode);
    var value = await reader.ReadToEndAsync();
    value = value.Replace(((char)0).ToString(), "");
    var expected = csv.Split("\n");
    var actual = value.Split("\n");
    Assert.AreEqual(expected.First(), actual.First());
    Assert.AreEqual(expected.Length, actual.Length);
    CollectionAssert.AreEquivalent(expected, actual);
  }

  private async Task<string> LoadCsv()
  {
    await using var stream = AssertExtensions.ReadTestResource("test-points.csv", GetType().Assembly);
    using var reader = new StreamReader(stream, Encoding.UTF8);
    return reader.ReadToEnd();
  }

}