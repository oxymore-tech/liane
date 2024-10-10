using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip;
using NUnit.Framework;

namespace Liane.Test.Internal.Trip;

public sealed class LianeTrackerTest
{
  [Test]
  public void ShouldGetFirstWayPoint()
  {
    var members = ImmutableList.Create(
      new TripMember("A", LabeledPositions.IspagnacParking, LabeledPositions.Mende),
      new TripMember("B", LabeledPositions.QuezacParking, LabeledPositions.Mende)
    );
    var waypoints = ImmutableList.Create(
      new WayPoint(LabeledPositions.IspagnacParking, 0, 0, DateTime.Now),
      new WayPoint(LabeledPositions.QuezacParking, 0, 0, DateTime.Now),
      new WayPoint(LabeledPositions.Mende, 0, 0, DateTime.Now)
    );
    var liane = new Api.Trip.Trip("id", Guid.Parse("019233a0-5c48-7cfa-b12e-7e7f0eb9c69f"), "A", DateTime.Now, DateTime.Now, null, waypoints, members, new Driver("A"), TripStatus.NotStarted);

    var tracker = new LianeTracker(null, liane);
    var firstPointIndexA = tracker.GetFirstWayPoint("A");
    var firstPointIndexB = tracker.GetFirstWayPoint("B");

    Assert.AreEqual(1, firstPointIndexA);
    Assert.AreEqual(1, firstPointIndexB);
  }
}