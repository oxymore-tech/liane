using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Routing;
using Liane.Api.Trip;
using NUnit.Framework;

namespace Liane.Test.Internal.Match;

public class MatchTest
{
  [Test]
  public void ShouldExtractMatchingTrip()
  {
#pragma warning disable CS8625
    var liane1 = new Api.Trip.Trip(null, null, null, new DateTime(2023, 04, 7, 15, 31, 0), null, new List<WayPoint>
    {
      new WayPoint(LabeledPositions.GorgesDuTarnCausses, 0,0, DateTime.Now),
      new WayPoint(LabeledPositions.BalsiegeParkingEglise, 0,0, DateTime.Now),
      new WayPoint(LabeledPositions.Mende, 0,0, DateTime.Now)
    }.ToImmutableList(), null, null, LianeState.NotStarted, null);
#pragma warning restore CS8625

    var m1 = new LianeMatch(liane1, 2, null, new Api.Trip.Match.Compatible(new Delta(0, 0), LabeledPositions.ChamperbouxEglise, LabeledPositions.Mende, new List<WayPoint>
    {
      new WayPoint(LabeledPositions.GorgesDuTarnCausses, 0,0, DateTime.Now),
      new WayPoint(LabeledPositions.ChamperbouxEglise, 0,0, DateTime.Now),
      new WayPoint(LabeledPositions.BalsiegeParkingEglise, 0,0, DateTime.Now),
      new WayPoint(LabeledPositions.Mende, 0,0, DateTime.Now)
    }.ToImmutableList()));
    var m2 = new LianeMatch(liane1, 1, null,new Api.Trip.Match.Exact(LabeledPositions.GorgesDuTarnCausses, LabeledPositions.BalsiegeParkingEglise));

    var matchingTrip1 = m1.GetMatchingTrip();
    var matchingTrip2 = m2.GetMatchingTrip();
    
    Assert.AreEqual(3, matchingTrip1.Count);
    Assert.AreEqual(2, matchingTrip2.Count);
    
    CollectionAssert.AreEqual(new List<RallyingPoint>{LabeledPositions.ChamperbouxEglise,LabeledPositions.BalsiegeParkingEglise,LabeledPositions.Mende}, matchingTrip1.Select(w => w.RallyingPoint));
    CollectionAssert.AreEqual(new List<RallyingPoint>{LabeledPositions.GorgesDuTarnCausses,LabeledPositions.BalsiegeParkingEglise}, matchingTrip2.Select(w => w.RallyingPoint));
  }
}