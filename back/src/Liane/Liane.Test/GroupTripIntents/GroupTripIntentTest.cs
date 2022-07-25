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

        var t1 = new TripIntent("arpajon-vic_1", "u1", rp1, rp2, GetTime("09:00"), null);
        var t2 = new TripIntent("arpajon-vic_2", "u2", rp1, rp2, GetTime("09:00"), null);
        var t3 = new TripIntent("arpajon-vic_3", "u3", rp1, rp2, GetTime("09:00"), null);

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
        points.TryGetValue(TripIntentStub.CantalPoints.arpajon, out var arpajon);
        points.TryGetValue(TripIntentStub.CantalPoints.vic, out var vic);
        points.TryGetValue(TripIntentStub.CantalPoints.saintpaul, out var saintpaul);
        points.TryGetValue(TripIntentStub.CantalPoints.saintsimon, out var saintsimon);
        points.TryGetValue(TripIntentStub.CantalPoints.sansac, out var sansac);
        points.TryGetValue(TripIntentStub.CantalPoints.ytrac, out var ytrac);
        points.TryGetValue(TripIntentStub.CantalPoints.laroquebrou, out var laroquebrou);
        points.TryGetValue(TripIntentStub.CantalPoints.reilhac, out var reilhac);
        points.TryGetValue(TripIntentStub.CantalPoints.naucelles, out var naucelles);
        points.TryGetValue(TripIntentStub.CantalPoints.aurillac, out var aurillac);
        
        var blanc = new TripIntent("blanc1", "1", laroquebrou, arpajon, GetTime("09:00"), GetTime("17:00"));
        var vert = new TripIntent("vert2", "2", saintpaul, aurillac, GetTime("09:00"), GetTime("17:00"));
        var jaune = new TripIntent("jaune3", "3", ytrac, vic, GetTime("09:00"), GetTime("17:00"));
        var rose = new TripIntent("rose4", "4", sansac, saintsimon, GetTime("09:00"), GetTime("17:00"));
        var rouge = new TripIntent("rouge5", "5", reilhac, vic, GetTime("09:00"), GetTime("17:00"));
        var bleu = new TripIntent("bleu6", "6", naucelles, aurillac, GetTime("09:00"), GetTime("17:00"));
        var noir = new TripIntent("noir7", "7", arpajon, vic, GetTime("09:00"), GetTime("17:00"));

        var cantalIntents = new List<TripIntent>()
        {
            blanc,
            vert,
            jaune,
            rose,
            rouge,
            bleu,
            noir
        };
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

        var t1 = new TripIntent("arpajon-vic_1", "u1", rp1, rp2, GetTime("09:00"), null);
        var t2 = new TripIntent("vic_arpajon_1", "u2", rp2, rp1, GetTime("09:00"), null);
        var t3 = new TripIntent("arpajon-vic_2", "u3", rp1, rp2, GetTime("09:00"), null);
        var t4 = new TripIntent("vic_arpajon_2", "u4", rp2, rp1, GetTime("09:00"), null);

        var trips = new List<TripIntent>()
        {
            t1, t2, t3, t4
        };

        var intentGroups = (await grouping.Group(trips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(2, intentGroups.Count);
    }

    [Test]
    public async Task ComposedTripGroupTest()
    {
        points.TryGetValue(TripIntentStub.CantalPoints.mauriac, out var mauriac);
        points.TryGetValue(TripIntentStub.CantalPoints.saintcernin, out var saintcernin);
        points.TryGetValue(TripIntentStub.CantalPoints.naucelles, out var naucelles);
        points.TryGetValue(TripIntentStub.CantalPoints.aurillac, out var aurillac);


        var t1 = new TripIntent("mauriac-aurillac_1", "u1", mauriac, aurillac, GetTime("09:00"), null);
        var t2 = new TripIntent("mauriac-naucelles_1", "u2", mauriac, naucelles, GetTime("09:00"), null);
        var t3 = new TripIntent("saintcernin-aurillac_1", "u3", saintcernin, aurillac, GetTime("09:00"), null);

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

        var t1 = new TripIntent("mauriac-aurillac_1", "u1", mauriac, aurillac, GetTime("09:00"), null);
        var t4 = new TripIntent("reilhac-aurillac_1", "u4", reilhac, aurillac, GetTime("09:00"), null);

        var t2 = new TripIntent("aurillac-mauriac_1", "u2", aurillac, mauriac, GetTime("09:00"), null);
        var t3 = new TripIntent("naucelles-mauriac_1", "u3", naucelles, mauriac, GetTime("09:00"), null);

        var trips = new List<TripIntent>()
        {
            t1, t2, t3, t4
        };

        var intentGroups = (await grouping.Group(trips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(2, intentGroups.Count);
    }

    [Test]
    public async Task OppositeComposedFlowsGroupTest()
    {
        points.TryGetValue(TripIntentStub.CantalPoints.arpajon, out var arpajon);
        points.TryGetValue(TripIntentStub.CantalPoints.vic, out var vic);
        points.TryGetValue(TripIntentStub.CantalPoints.saintpaul, out var saintpaul);
        points.TryGetValue(TripIntentStub.CantalPoints.saintsimon, out var saintsimon);
        points.TryGetValue(TripIntentStub.CantalPoints.sansac, out var sansac);
        points.TryGetValue(TripIntentStub.CantalPoints.ytrac, out var ytrac);
        points.TryGetValue(TripIntentStub.CantalPoints.laroquebrou, out var laroquebrou);
        points.TryGetValue(TripIntentStub.CantalPoints.reilhac, out var reilhac);
        points.TryGetValue(TripIntentStub.CantalPoints.naucelles, out var naucelles);
        points.TryGetValue(TripIntentStub.CantalPoints.aurillac, out var aurillac);
        points.TryGetValue(TripIntentStub.CantalPoints.saintcernin, out var saintcernin);

        
        var t1 = new TripIntent("laroquebrou->vic_1", "1", laroquebrou, vic, GetTime("09:00"), GetTime("17:00"));
        var t2 = new TripIntent("vic->laroquebrou_1", "2", vic, laroquebrou, GetTime("09:00"), GetTime("17:00"));
        var t3 = new TripIntent("laroquebrou->saintcernin_1", "3", laroquebrou, saintcernin, GetTime("09:00"), GetTime("17:00"));

        var cantalIntents = new List<TripIntent>()
        {
            t1,
            t2,
            t3,
        };
        var intentGroups = (await grouping.Group(cantalIntents)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(1, intentGroups.Count);
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
    
    
    private static DateTime GetTime(string timeStr)
    {
        return DateTime.ParseExact(timeStr, "HH:mm", null);
    }
}

