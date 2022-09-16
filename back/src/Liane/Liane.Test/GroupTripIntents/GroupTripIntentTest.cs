using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Grouping;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.RallyingPoints;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using MongoDB.Bson;
using NUnit.Framework;

namespace Liane.Test.GroupTripIntents;

[TestFixture]
public sealed class GroupTripIntentTest
{
    private IntentMatchingServiceImpl grouping;
    private readonly RoutingServiceImpl routingService;

    private const int InterpolationRadius = 2_000; // Adaptable
    private Dictionary<TripIntentStub.CantalPoints, RallyingPoint> points;

    public GroupTripIntentTest()
    {
        grouping = new IntentMatchingServiceImpl(null, null!);

        points = TripIntentStub.GetRallyingPoints();
        var osrmService = new OsrmServiceImpl(new OsrmSettings(new Uri("http://router.project-osrm.org")));
        routingService = new RoutingServiceImpl(osrmService);
    }

    private IEnumerable<Task<DbTripIntent>> LinkIntents(List<TripIntent> tripIntents)
    {
        var r = tripIntents.Select(async t => await LinkToPoints(t));

        return r;
    }

    // Adapted from TripIntentServiceImpl
    private async Task<DbTripIntent> LinkToPoints(TripIntent ti)
    {
        var start = ti.From.Location;
        var end = ti.To.Location;

        // Get the shortest path (list of coordinates) calculated with OSRM
        var route = await routingService.BasicRouteMethod(new RoutingQuery(start, end));

        // Interpolate to find the RallyingPoints it passes by (< 1 km)
        var waySegments = new Dictionary<DbRallyingPoint, DbRallyingPoint>();

        DbRallyingPoint? previousPoint = null;
        foreach (var wp in route.Coordinates)
        {
            var (closestPoint, distance) = FindClosest(new LatLng(wp.Lat, wp.Lng));

            if (!(distance < InterpolationRadius) || waySegments.ContainsKey(closestPoint))
            {
                continue;
            }

            if (previousPoint is not null)
            {
                waySegments[previousPoint] = closestPoint;
            }

            waySegments.Add(closestPoint, null!); // The last segment will have the last point as key and null as value
            previousPoint = closestPoint;
        }

        return new DbTripIntent(
            ObjectId.Parse(ti.Id), ti.User,
            RallyingPointServiceImpl.ToDbRallyingPoint(ti.From), RallyingPointServiceImpl.ToDbRallyingPoint(ti.To),
            ti.FromTime, ti.ToTime,
            waySegments, ti.Title);
    }

    // Adapted from TripIntentServiceImpl
    private (DbRallyingPoint point, double distance) FindClosest(LatLng loc)
    {
        var rallyingPoints = points.Values.ToList();

        var i = 0;
        var closestPoint = rallyingPoints[i];
        var minDistance = closestPoint.Location.CalculateDistance(loc);

        i++;
        while (i < rallyingPoints.Count)
        {
            var currentDistance = rallyingPoints[i].Location.CalculateDistance(loc);
            if (currentDistance < minDistance)
            {
                minDistance = currentDistance;
                closestPoint = rallyingPoints[i];
            }

            i++;
        }

        return (RallyingPointServiceImpl.ToDbRallyingPoint(closestPoint), minDistance);
    }

    private string CreateId()
    {
        return ObjectId.GenerateNewId().ToString();
    }

    [Test]
    public async Task SingleGroupTest()
    {
        var rp1 = points[TripIntentStub.CantalPoints.Arpajon];
        var rp2 = points[TripIntentStub.CantalPoints.Vic];

        var t1 = new TripIntent(CreateId(), "u1", rp1, rp2, GetTime("09:00"), null, "arpajon-vic_1");
        var t2 = new TripIntent(CreateId(), "u2", rp1, rp2, GetTime("09:00"), null, "arpajon-vic_2");
        var t3 = new TripIntent(CreateId(), "u3", rp1, rp2, GetTime("09:00"), null, "arpajon-vic_3");

        var trips = new List<TripIntent>()
        {
            t1, t2, t3
        };

        var linkedTrips = new List<DbTripIntent>();
        foreach (var t in LinkIntents(trips))
        {
            linkedTrips.Add(await t);
        }

        var intentGroups = (IntentMatchingServiceImpl.Group(linkedTrips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(1, intentGroups.Count);
    }

    [Test]
    public async Task CrossRoadsGroupIntentsTest()
    {
        var arpajon = points[TripIntentStub.CantalPoints.Arpajon];
        var vic = points[TripIntentStub.CantalPoints.Vic];
        var saintpaul = points[TripIntentStub.CantalPoints.Saintpaul];
        var saintsimon = points[TripIntentStub.CantalPoints.Saintsimon];
        var sansac = points[TripIntentStub.CantalPoints.Sansac];
        var ytrac = points[TripIntentStub.CantalPoints.Ytrac];
        var laroquebrou = points[TripIntentStub.CantalPoints.Laroquebrou];
        var reilhac = points[TripIntentStub.CantalPoints.Reilhac];
        var naucelles = points[TripIntentStub.CantalPoints.Naucelles];
        var aurillac = points[TripIntentStub.CantalPoints.Aurillac];

        var blanc = new TripIntent(CreateId(), "1", laroquebrou, arpajon, GetTime("09:00"), GetTime("17:00"), "blanc1");
        var vert = new TripIntent(CreateId(), "2", saintpaul, aurillac, GetTime("09:00"), GetTime("17:00"), "vert2");
        var jaune = new TripIntent(CreateId(), "3", ytrac, vic, GetTime("09:00"), GetTime("17:00"), "jaune3");
        var rose = new TripIntent(CreateId(), "4", sansac, saintsimon, GetTime("09:00"), GetTime("17:00"), "rose4");
        var rouge = new TripIntent(CreateId(), "5", reilhac, vic, GetTime("09:00"), GetTime("17:00"), "rouge5");
        var bleu = new TripIntent(CreateId(), "6", naucelles, aurillac, GetTime("09:00"), GetTime("17:00"), "bleu6");
        var noir = new TripIntent(CreateId(), "7", arpajon, vic, GetTime("09:00"), GetTime("17:00"), "noir7");

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

        var linkedTrips = new List<DbTripIntent>();
        foreach (var t in LinkIntents(cantalIntents))
        {
            linkedTrips.Add(await t);
        }

        var intentGroups = (IntentMatchingServiceImpl.Group(linkedTrips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(4, intentGroups.Count);
    }

    [Test]
    public async Task OppositeFlowGroupTest()
    {
        var rp1 = points[TripIntentStub.CantalPoints.Arpajon];
        var rp2 = points[TripIntentStub.CantalPoints.Vic];

        var t1 = new TripIntent(CreateId(), "u1", rp1, rp2, GetTime("09:00"), null, "arpajon-vic_1");
        var t2 = new TripIntent(CreateId(), "u2", rp2, rp1, GetTime("09:00"), null, "vic_arpajon_1");
        var t3 = new TripIntent(CreateId(), "u3", rp1, rp2, GetTime("09:00"), null, "arpajon-vic_2");
        var t4 = new TripIntent(CreateId(), "u4", rp2, rp1, GetTime("09:00"), null, "vic_arpajon_2");

        var trips = new List<TripIntent>()
        {
            t1, t2, t3, t4
        };

        var linkedTrips = new List<DbTripIntent>();
        foreach (var t in LinkIntents(trips))
        {
            linkedTrips.Add(await t);
        }

        var intentGroups = (IntentMatchingServiceImpl.Group(linkedTrips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(2, intentGroups.Count);
    }

    [Test]
    public async Task ComposedTripGroupTest()
    {
        var mauriac = points[TripIntentStub.CantalPoints.Mauriac];
        var saintcernin = points[TripIntentStub.CantalPoints.Saintcernin];
        var naucelles = points[TripIntentStub.CantalPoints.Naucelles];
        var aurillac = points[TripIntentStub.CantalPoints.Aurillac];


        var t1 = new TripIntent(CreateId(), "u1", mauriac, aurillac, GetTime("09:00"), null, "mauriac-aurillac_1");
        var t2 = new TripIntent(CreateId(), "u2", mauriac, naucelles, GetTime("09:00"), null, "mauriac-naucelles_1");
        var t3 = new TripIntent(CreateId(), "u3", saintcernin, aurillac, GetTime("09:00"), null, "saintcernin-aurillac_1");

        var trips = new List<TripIntent>()
        {
            t1, t2, t3
        };

        var linkedTrips = new List<DbTripIntent>();
        foreach (var t in LinkIntents(trips))
        {
            linkedTrips.Add(await t);
        }

        var intentGroups = (IntentMatchingServiceImpl.Group(linkedTrips)).ToList();
        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(3, intentGroups.Count);
    }

    [Test]
    public async Task ComposedFlowsTripGroupTest()
    {
        var mauriac = points[TripIntentStub.CantalPoints.Mauriac];
        var reilhac = points[TripIntentStub.CantalPoints.Reilhac];
        var naucelles = points[TripIntentStub.CantalPoints.Naucelles];
        var aurillac = points[TripIntentStub.CantalPoints.Aurillac];

        var t1 = new TripIntent(CreateId(), "u1", mauriac, aurillac, GetTime("09:00"), null, "mauriac-aurillac_1");
        var t4 = new TripIntent(CreateId(), "u4", reilhac, aurillac, GetTime("09:00"), null, "reilhac-aurillac_1");

        var t2 = new TripIntent(CreateId(), "u2", aurillac, mauriac, GetTime("09:00"), null, "aurillac-mauriac_1");
        var t3 = new TripIntent(CreateId(), "u3", naucelles, mauriac, GetTime("09:00"), null, "naucelles-mauriac_1");

        var trips = new List<TripIntent>()
        {
            t1, t2, t3, t4
        };

        var linkedTrips = new List<DbTripIntent>();
        foreach (var t in LinkIntents(trips))
        {
            linkedTrips.Add(await t);
        }

        var intentGroups = (IntentMatchingServiceImpl.Group(linkedTrips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(2, intentGroups.Count);
    }

    [Test]
    public async Task OppositeComposedFlowsGroupTest()
    {
        var vic = points[TripIntentStub.CantalPoints.Vic];
        var laroquebrou = points[TripIntentStub.CantalPoints.Laroquebrou];
        var saintcernin = points[TripIntentStub.CantalPoints.Saintcernin];

        var t1 = new TripIntent(CreateId(), "1", laroquebrou, vic, GetTime("09:00"), GetTime("17:00"), "laroquebrou->vic_1");
        var t2 = new TripIntent(CreateId(), "2", vic, laroquebrou, GetTime("09:00"), GetTime("17:00"), "vic->laroquebrou_1");
        var t3 = new TripIntent(CreateId(), "3", laroquebrou, saintcernin, GetTime("09:00"), GetTime("17:00"), "laroquebrou->saintcernin_1");

        var trips = new List<TripIntent>()
        {
            t1,
            t2,
            t3,
        };

        var linkedTrips = new List<DbTripIntent>();
        foreach (var t in LinkIntents(trips))
        {
            linkedTrips.Add(await t);
        }

        var intentGroups = (IntentMatchingServiceImpl.Group(linkedTrips)).ToList();

        DisplayGroups(intentGroups);

        // See plan
        Assert.AreEqual(1, intentGroups.Count);
    }

    private static void DisplayGroups(List<List<ProcessedTripIntent>> intentGroups)
    {
        foreach (var group in intentGroups)
        {
            Console.Out.WriteAsync("Group (" + group[0].P1.Label + " -> " + group[0].P2.Label + ") : [ ");
            group.ForEach((t) => Console.Write(t.TripIntent.Title + " "));
            Console.Out.WriteLineAsync("]");
        }
    }

    private static DateTime GetTime(string timeStr)
    {
        return DateTime.ParseExact(timeStr, "HH:mm", null);
    }
}