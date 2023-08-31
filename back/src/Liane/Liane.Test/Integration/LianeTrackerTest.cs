using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Trip;
using Liane.Test.Util;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;
[TestFixture(Category = "Integration")]
public class LianeTrackerTest: BaseIntegrationTest
{

  private (global::Liane.Api.Trip.Liane liane, FeatureCollection pings) PrepareTestData(Ref<User> userId)
  {
    var departureTime = DateTime.Parse("2023-08-08T16:12:53.061Z");
    var liane =  new global::Liane.Api.Trip.Liane(
      "6410edc1e02078e7108a5895",
      userId,
      DateTime.Today,
      departureTime,
      null,
      new List<WayPoint>
      {
        new(LabeledPositions.Tournefeuille, 0, 0, departureTime),
        new(LabeledPositions.AireDesPyrénées, 45*60, 65000, DateTime.Parse("2023-08-08T16:57:54.000Z")),
        new(LabeledPositions.PointisInard, 19*60, 24000, DateTime.Parse("2023-08-08T17:17:05.000Z"))
      }.ToImmutableList(),
      new List<LianeMember>
      {
        new (userId, LabeledPositions.Tournefeuille, LabeledPositions.PointisInard, 3),
        new ("userB", LabeledPositions.Tournefeuille, LabeledPositions.AireDesPyrénées)
      }.ToImmutableList(),
      new Driver(userId),
      LianeState.NotStarted,
      null
    );
    return (liane, JsonSerializer.Deserialize<FeatureCollection>(AssertExtensions.ReadTestResource("Geolocation/test-tournefeuille-pointis-inard.json"))!);
  }

  [Test]
  public async Task ShouldFinishTrip()
  {
    var finished = false;
    var userId = "6410edc1e02078e7108a5897";
    var (liane, geojsonPings) = PrepareTestData(userId);
    var tracker = await new LianeTracker.Builder(liane)
      .SetTripArrivedDestinationCallback(() =>
      {
        finished = true;
      })
      .Build(ServiceProvider.GetService<IOsrmService>()!, ServiceProvider.GetService<IPostgisService>()!, ServiceProvider.GetService<IMongoDatabase>()!);
 
    var pings = geojsonPings.Features.Select(f =>
    {
      var point = (f.Geometry as Point)!;
      var time = f.Properties["timestamp"].ToString()!;
      return (timestamp: DateTime.Parse(time), coordinate: new LatLng(point.Coordinates.Latitude, point.Coordinates.Longitude));
    });
    foreach (var p in pings.OrderBy(p => p.timestamp))
    {
      if (finished) break;
      await tracker.Push(new UserPing(liane.CreatedBy, p.timestamp, TimeSpan.Zero, p.coordinate));
    }
   
    var lastLocation = tracker.GetCurrentMemberLocation(userId);
    Assert.AreEqual(liane.WayPoints.Last().RallyingPoint.Id, lastLocation!.NextPoint.Id); 
    
    Assert.True(finished);

  }

  protected override void Setup(IMongoDatabase db)
  {
    
  }
}