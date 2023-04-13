using System;
using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Trip;
using NUnit.Framework;

namespace Liane.Test.Internal.Trip;

[TestFixture]
public sealed class BestMatchComparerTest
{
  [Test]
  public void ShouldCompare()
  {
    var bestMatchComparer = new BestMatchComparer(LabeledPositions.Cocures, LabeledPositions.BalsiegeParkingEglise,
      new DepartureOrArrivalTime(new DateTime(2023, 04, 7, 10, 17, 0), Direction.Departure));

#pragma warning disable CS8625
    var liane1 = new Api.Trip.Liane(null, null, null, new DateTime(2023, 04, 7, 15, 31, 0), null, null, null, null, null, null);
    var liane2 = new Api.Trip.Liane(null, null, null, new DateTime(2023, 04, 7, 14, 00, 0), null, null, null, null, null, null);
#pragma warning restore CS8625

    var m1 = new LianeMatch(liane1, 2, new Api.Trip.Match.Compatible(new Delta(0, 0), LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise, ImmutableSortedSet<WayPoint>.Empty));
    var m2 = new LianeMatch(liane2, 1, new Api.Trip.Match.Compatible(new Delta(0, 0), LabeledPositions.Florac, LabeledPositions.BalsiegeParkingEglise, ImmutableSortedSet<WayPoint>.Empty));

    var actual = bestMatchComparer.Compare(m1, m2);
    Assert.IsTrue(actual > 0);
  }


}