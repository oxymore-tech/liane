using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Postgis;
using Liane.Service.Internal.Trip;
using Moq;
using NUnit.Framework;

namespace Liane.Test.Internal.Trip;

public sealed class TripTrackerTest
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
    var liane = new Api.Trip.Trip("id", null!, "A", DateTime.Now, DateTime.Now, null, waypoints, members, new Driver("A"), TripStatus.NotStarted);

    var tracker = new TripTracker(new Mock<ITripSession>().Object, liane);
    var firstPointIndexA = tracker.GetFirstWayPoint("A");
    var firstPointIndexB = tracker.GetFirstWayPoint("B");

    Assert.AreEqual(1, firstPointIndexA);
    Assert.AreEqual(1, firstPointIndexB);
  }
}