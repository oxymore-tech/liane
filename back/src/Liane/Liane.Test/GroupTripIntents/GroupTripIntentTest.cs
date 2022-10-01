using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
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
    // private IntentMatchingServiceImpl grouping;
    // private readonly RoutingServiceImpl routingService;
    //
    // private const int InterpolationRadius = 2_000; // Adaptable
    // private Dictionary<TripIntentStub.CantalPoints, RallyingPoint> points;
    //
    // public GroupTripIntentTest()
    // {
    //     grouping = new IntentMatchingServiceImpl(null,null,null, null!);
    //
    //     points = TripIntentStub.GetRallyingPoints();
    //     var osrmService = new OsrmServiceImpl(new OsrmSettings(new Uri("http://router.project-osrm.org")));
    //     routingService = new RoutingServiceImpl(osrmService);
    // }
    //
    // private IEnumerable<Task<DbTripIntent>> LinkIntents(IEnumerable<TripIntent> tripIntents)
    // {
    //     return tripIntents.Select(async t => await LinkToPoints(t));
    // }
    //
    // // Adapted from TripIntentServiceImpl
    // private async Task<DbTripIntent> LinkToPoints(TripIntent ti)
    // {
    //     var start = ti.From;
    //     var end = ti.To;
    //
    //     // Get the shortest path (list of coordinates) calculated with OSRM
    //     var route = await routingService.BasicRouteMethod(new RoutingQuery(start, end));
    //
    //     // Interpolate to find the RallyingPoints it passes by (< 1 km)
    //     var waySegments = new Dictionary<DbRallyingPoint, DbRallyingPoint>();
    //
    //     DbRallyingPoint? previousPoint = null;
    //     foreach (var wp in route.Coordinates)
    //     {
    //         var (closestPoint, distance) = FindClosest(new LatLng(wp.Lat, wp.Lng));
    //
    //         if (!(distance < InterpolationRadius) || waySegments.ContainsKey(closestPoint))
    //         {
    //             continue;
    //         }
    //
    //         if (previousPoint is not null)
    //         {
    //             waySegments[previousPoint] = closestPoint;
    //         }
    //
    //         waySegments.Add(closestPoint, null!); // The last segment will have the last point as key and null as value
    //         previousPoint = closestPoint;
    //     }
    //
    //     return new DbTripIntent(
    //         ObjectId.Parse(ti.Id), ti.Title, ti.User,
    //         ti.From, ti.To,
    //         ti.GoTime, ti.ReturnTime);
    // }
    //
    // // Adapted from TripIntentServiceImpl
    // private (DbRallyingPoint point, double distance) FindClosest(LatLng loc)
    // {
    //     var rallyingPoints = points.Values.ToList();
    //
    //     var i = 0;
    //     var closestPoint = rallyingPoints[i];
    //     var minDistance = closestPoint.Location.CalculateDistance(loc);
    //
    //     i++;
    //     while (i < rallyingPoints.Count)
    //     {
    //         var currentDistance = rallyingPoints[i].Location.CalculateDistance(loc);
    //         if (currentDistance < minDistance)
    //         {
    //             minDistance = currentDistance;
    //             closestPoint = rallyingPoints[i];
    //         }
    //
    //         i++;
    //     }
    //
    //     return (RallyingPointServiceImpl.ToDbRallyingPoint(closestPoint), minDistance);
    // }
    //
    // private string CreateId()
    // {
    //     return ObjectId.GenerateNewId().ToString();
    // }
    //
    // [Test]
    // public async Task SingleGroupTest()
    // {
    //     var rp1 = points[TripIntentStub.CantalPoints.Arpajon];
    //     var rp2 = points[TripIntentStub.CantalPoints.Vic];
    //
    //     var t1 = new TripIntent(CreateId(), "arpajon-vic_1", rp1.Id, rp2.Id, GetTime("09:00"), null);
    //     var t2 = new TripIntent(CreateId(), "arpajon-vic_2", rp1.Id, rp2.Id, GetTime("09:00"), null);
    //     var t3 = new TripIntent(CreateId(), "arpajon-vic_3", rp1.Id, rp2.Id, GetTime("09:00"), null);
    //
    //     var trips = new List<TripIntent>()
    //     {
    //         t1, t2, t3
    //     };
    //
    //     var linkedTrips = (await Task.WhenAll(LinkIntents(trips))).ToImmutableList();
    //
    //     var intentGroups = (await IntentMatchingServiceImpl.Group(linkedTrips)).ToList();
    //
    //     DisplayGroups(intentGroups);
    //
    //     // See plan
    //     Assert.AreEqual(1, intentGroups.Count);
    // }
    //
    // [Test]
    // public async Task CrossRoadsGroupIntentsTest()
    // {
    //     var arpajon = points[TripIntentStub.CantalPoints.Arpajon];
    //     var vic = points[TripIntentStub.CantalPoints.Vic];
    //     var saintpaul = points[TripIntentStub.CantalPoints.Saintpaul];
    //     var saintsimon = points[TripIntentStub.CantalPoints.Saintsimon];
    //     var sansac = points[TripIntentStub.CantalPoints.Sansac];
    //     var ytrac = points[TripIntentStub.CantalPoints.Ytrac];
    //     var laroquebrou = points[TripIntentStub.CantalPoints.Laroquebrou];
    //     var reilhac = points[TripIntentStub.CantalPoints.Reilhac];
    //     var naucelles = points[TripIntentStub.CantalPoints.Naucelles];
    //     var aurillac = points[TripIntentStub.CantalPoints.Aurillac];
    //
    //     var blanc = new TripIntent(CreateId(), "blanc1", laroquebrou.Id, arpajon.Id, GetTime("09:00"), GetTime("17:00"));
    //     var vert = new TripIntent(CreateId(), "vert2", saintpaul.Id, aurillac.Id, GetTime("09:00"), GetTime("17:00"));
    //     var jaune = new TripIntent(CreateId(), "jaune3", ytrac.Id, vic.Id, GetTime("09:00"), GetTime("17:00"));
    //     var rose = new TripIntent(CreateId(), "rose4", sansac.Id, saintsimon.Id, GetTime("09:00"), GetTime("17:00"));
    //     var rouge = new TripIntent(CreateId(), "rouge5", reilhac.Id, vic.Id, GetTime("09:00"), GetTime("17:00"));
    //     var bleu = new TripIntent(CreateId(), "bleu6", naucelles.Id, aurillac.Id, GetTime("09:00"), GetTime("17:00"));
    //     var noir = new TripIntent(CreateId(), "noir7", arpajon.Id, vic.Id, GetTime("09:00"), GetTime("17:00"));
    //
    //     var cantalIntents = new List<TripIntent>()
    //     {
    //         blanc,
    //         vert,
    //         jaune,
    //         rose,
    //         rouge,
    //         bleu,
    //         noir
    //     };
    //
    //     var linkedTrips = new List<DbTripIntent>();
    //     foreach (var t in LinkIntents(cantalIntents))
    //     {
    //         linkedTrips.Add(await t);
    //     }
    //
    //     var intentGroups = (await IntentMatchingServiceImpl.Group(linkedTrips)).ToList();
    //
    //     DisplayGroups(intentGroups);
    //
    //     // See plan
    //     Assert.AreEqual(4, intentGroups.Count);
    // }
    //
    // [Test]
    // public async Task OppositeFlowGroupTest()
    // {
    //     var rp1 = points[TripIntentStub.CantalPoints.Arpajon];
    //     var rp2 = points[TripIntentStub.CantalPoints.Vic];
    //
    //     var t1 = new TripIntent(CreateId(), "arpajon-vic_1", rp1.Id, rp2.Id, GetTime("09:00"), null);
    //     var t2 = new TripIntent(CreateId(), "vic_arpajon_1", rp2.Id, rp1.Id, GetTime("09:00"), null);
    //     var t3 = new TripIntent(CreateId(), "arpajon-vic_2", rp1.Id, rp2.Id, GetTime("09:00"), null);
    //     var t4 = new TripIntent(CreateId(), "vic_arpajon_2", rp2.Id, rp1.Id, GetTime("09:00"), null);
    //
    //     var trips = new List<TripIntent>()
    //     {
    //         t1, t2, t3, t4
    //     };
    //
    //     var linkedTrips = new List<DbTripIntent>();
    //     foreach (var t in LinkIntents(trips))
    //     {
    //         linkedTrips.Add(await t);
    //     }
    //
    //     var intentGroups = (await IntentMatchingServiceImpl.Group(linkedTrips)).ToList();
    //
    //     DisplayGroups(intentGroups);
    //
    //     // See plan
    //     Assert.AreEqual(2, intentGroups.Count);
    // }
    //
    // [Test]
    // public async Task ComposedTripGroupTest()
    // {
    //     var mauriac = points[TripIntentStub.CantalPoints.Mauriac];
    //     var saintcernin = points[TripIntentStub.CantalPoints.Saintcernin];
    //     var naucelles = points[TripIntentStub.CantalPoints.Naucelles];
    //     var aurillac = points[TripIntentStub.CantalPoints.Aurillac];
    //
    //
    //     var t1 = new TripIntent(CreateId(), "mauriac-aurillac_1", mauriac.Id, aurillac.Id, GetTime("09:00"), null);
    //     var t2 = new TripIntent(CreateId(), "mauriac-naucelles_1", mauriac.Id, naucelles.Id, GetTime("09:00"), null);
    //     var t3 = new TripIntent(CreateId(), "saintcernin-aurillac_1", saintcernin.Id, aurillac.Id, GetTime("09:00"), null);
    //
    //     var trips = new List<TripIntent>()
    //     {
    //         t1, t2, t3
    //     };
    //
    //     var linkedTrips = new List<DbTripIntent>();
    //     foreach (var t in LinkIntents(trips))
    //     {
    //         linkedTrips.Add(await t);
    //     }
    //
    //     var intentGroups = (await IntentMatchingServiceImpl.Group(linkedTrips)).ToList();
    //     DisplayGroups(intentGroups);
    //
    //     // See plan
    //     Assert.AreEqual(3, intentGroups.Count);
    // }
    //
    // [Test]
    // public async Task ComposedFlowsTripGroupTest()
    // {
    //     var mauriac = points[TripIntentStub.CantalPoints.Mauriac];
    //     var reilhac = points[TripIntentStub.CantalPoints.Reilhac];
    //     var naucelles = points[TripIntentStub.CantalPoints.Naucelles];
    //     var aurillac = points[TripIntentStub.CantalPoints.Aurillac];
    //
    //     var t1 = new TripIntent(CreateId(), "mauriac-aurillac_1", mauriac.Id, aurillac.Id, GetTime("09:00"), null);
    //     var t4 = new TripIntent(CreateId(), "reilhac-aurillac_1", reilhac.Id, aurillac.Id, GetTime("09:00"), null);
    //
    //     var t2 = new TripIntent(CreateId(), "aurillac-mauriac_1", aurillac.Id, mauriac.Id, GetTime("09:00"), null);
    //     var t3 = new TripIntent(CreateId(), "naucelles-mauriac_1", naucelles.Id, mauriac.Id, GetTime("09:00"), null);
    //
    //     var trips = new List<TripIntent>()
    //     {
    //         t1, t2, t3, t4
    //     };
    //
    //     var linkedTrips = new List<DbTripIntent>();
    //     foreach (var t in LinkIntents(trips))
    //     {
    //         linkedTrips.Add(await t);
    //     }
    //
    //     var intentGroups = (await IntentMatchingServiceImpl.Group(linkedTrips)).ToList();
    //
    //     DisplayGroups(intentGroups);
    //
    //     // See plan
    //     Assert.AreEqual(2, intentGroups.Count);
    // }
    //
    // [Test]
    // public async Task OppositeComposedFlowsGroupTest()
    // {
    //     var vic = points[TripIntentStub.CantalPoints.Vic];
    //     var laroquebrou = points[TripIntentStub.CantalPoints.Laroquebrou];
    //     var saintcernin = points[TripIntentStub.CantalPoints.Saintcernin];
    //
    //     var t1 = new TripIntent(CreateId(), "laroquebrou->vic_1", laroquebrou.Id, vic.Id, GetTime("09:00"), GetTime("17:00"));
    //     var t2 = new TripIntent(CreateId(), "vic->laroquebrou_1", vic.Id, laroquebrou.Id, GetTime("09:00"), GetTime("17:00"));
    //     var t3 = new TripIntent(CreateId(), "laroquebrou->saintcernin_1", laroquebrou.Id, saintcernin.Id, GetTime("09:00"), GetTime("17:00"));
    //
    //     var trips = new List<TripIntent>()
    //     {
    //         t1,
    //         t2,
    //         t3,
    //     };
    //
    //     var linkedTrips = new List<DbTripIntent>();
    //     foreach (var t in LinkIntents(trips))
    //     {
    //         linkedTrips.Add(await t);
    //     }
    //
    //     var intentGroups = (await IntentMatchingServiceImpl.Group(linkedTrips)).ToList();
    //
    //     DisplayGroups(intentGroups);
    //
    //     // See plan
    //     Assert.AreEqual(1, intentGroups.Count);
    // }
    //
    // private static void DisplayGroups(List<List<ProcessedTripIntent>> intentGroups)
    // {
    //     foreach (var group in intentGroups)
    //     {
    //         Console.Out.WriteAsync("Group (" + group[0].P1.Label + " -> " + group[0].P2.Label + ") : [ ");
    //         group.ForEach((t) => Console.Write(t.TripIntent.Title + " "));
    //         Console.Out.WriteLineAsync("]");
    //     }
    // }
    //
    // private static TimeOnly GetTime(string timeStr)
    // {
    //     return TimeOnly.ParseExact(timeStr, "HH:mm", null);
    // }
}