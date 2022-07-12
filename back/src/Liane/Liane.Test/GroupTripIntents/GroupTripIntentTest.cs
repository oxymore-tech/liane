using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.RallyingPoints;
using Liane.Api.Trip;
using Liane.Service.Internal.Grouping;
using NUnit.Framework;

namespace Liane.Test.GroupTripIntents;

[TestFixture]
public sealed class GroupTripIntentTest
{
    private TripIntentsGrouping grouping;

    private Dictionary<TripIntentStub.CantalPoints, RallyingPoint> points;

    public GroupTripIntentTest()
    {
        points = TripIntentStub.GetRallyingPoints();
        grouping = new TripIntentsGrouping(points.Values.ToList());
    }

    [Test]
    public async Task SingleGroupTest()
    {
        points.TryGetValue(TripIntentStub.CantalPoints.arpajon, out var rp1);
        points.TryGetValue(TripIntentStub.CantalPoints.vic, out var rp2);

        var t1 = new TripIntent("arpajon-vic_1", "u1", rp1, rp2, TripIntentStub.GetTime("09:00"), null);
        var t2 = new TripIntent("arpajon-vic_2", "u2", rp1, rp2, TripIntentStub.GetTime("09:00"), null);
        var t3 = new TripIntent("arpajon-vic_3", "u3", rp1, rp2, TripIntentStub.GetTime("09:00"), null);

        var trips = new List<TripIntent>()
        {
            t1, t2, t3
        };

        var intentGroups = (await grouping.Group(trips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(1, intentGroups.Count);
    }

    [Test]
    public async Task CrossRoadsGroupIntentsTest()
    {
        var cantalIntents = TripIntentStub.GetTripIntents();
        var intentGroups = (await grouping.Group(cantalIntents)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(4, intentGroups.Count);
    }

    [Test]
    public async Task OppositeFlowGroupTest()
    {
        points.TryGetValue(TripIntentStub.CantalPoints.arpajon, out var rp1);
        points.TryGetValue(TripIntentStub.CantalPoints.vic, out var rp2);

        var t1 = new TripIntent("arpajon-vic_1", "u1", rp1, rp2, TripIntentStub.GetTime("09:00"), null);
        var t2 = new TripIntent("vic_arpajon_1", "u2", rp2, rp1, TripIntentStub.GetTime("09:00"), null);
        var t3 = new TripIntent("arpajon-vic_2", "u3", rp1, rp2, TripIntentStub.GetTime("09:00"), null);

        var trips = new List<TripIntent>()
        {
            t1, t2, t3
        };

        var intentGroups = (await grouping.Group(trips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(1, intentGroups.Count);
    }

    [Test]
    public async Task ComposedTripGroupTest()
    {
        points.TryGetValue(TripIntentStub.CantalPoints.mauriac, out var mauriac);
        points.TryGetValue(TripIntentStub.CantalPoints.saintcernin, out var saintcernin);
        points.TryGetValue(TripIntentStub.CantalPoints.naucelles, out var naucelles);
        points.TryGetValue(TripIntentStub.CantalPoints.aurillac, out var aurillac);


        var t1 = new TripIntent("mauriac-aurillac_1", "u1", mauriac, aurillac, TripIntentStub.GetTime("09:00"), null);
        var t2 = new TripIntent("mauriac-naucelles_1", "u2", mauriac, naucelles, TripIntentStub.GetTime("09:00"), null);
        var t3 = new TripIntent("saintcernin-aurillac_1", "u3", saintcernin, aurillac, TripIntentStub.GetTime("09:00"), null);

        var trips = new List<TripIntent>()
        {
            t1, t2, t3
        };

        var intentGroups = (await grouping.Group(trips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(3, intentGroups.Count);
    }

    [Test]
    public async Task ComposedFlowsTripGroupTest()
    {
        points.TryGetValue(TripIntentStub.CantalPoints.mauriac, out var mauriac);
        points.TryGetValue(TripIntentStub.CantalPoints.reilhac, out var reilhac);
        points.TryGetValue(TripIntentStub.CantalPoints.naucelles, out var naucelles);
        points.TryGetValue(TripIntentStub.CantalPoints.aurillac, out var aurillac);

        var t1 = new TripIntent("mauriac-aurillac_1", "u1", mauriac, aurillac, TripIntentStub.GetTime("09:00"), null);
        var t4 = new TripIntent("reilhac-aurillac_1", "u4", reilhac, aurillac, TripIntentStub.GetTime("09:00"), null);

        var t2 = new TripIntent("aurillac-mauriac_1", "u2", aurillac, mauriac, TripIntentStub.GetTime("09:00"), null);
        var t3 = new TripIntent("naucelles-mauriac_1", "u3", naucelles, mauriac, TripIntentStub.GetTime("09:00"), null);

        var trips = new List<TripIntent>()
        {
            t1, t2, t3, t4
        };

        var intentGroups = (await grouping.Group(trips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(2, intentGroups.Count);
    }

    private static void DisplayGroups(List<List<MatchedTripIntent>> intentGroups)
    {
        foreach (var group in intentGroups)
        {
            Console.Out.WriteAsync("Group (" + group[0].P1.Label + " -> " + group[0].P2.Label + ") : [ ");
            group.ForEach((t) => Console.Write(t.Trip.Trip.Id + " "));
            Console.Out.WriteLineAsync("]");
        }
    }
}