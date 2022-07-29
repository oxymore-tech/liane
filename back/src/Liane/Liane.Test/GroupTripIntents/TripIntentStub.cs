using System.Collections.Generic;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using MongoDB.Bson;

namespace Liane.Test.GroupTripIntents;

public static class TripIntentStub
{
    public enum CantalPoints
    {
        aurillac,
        saintpaul,
        ytrac,
        vic,
        arpajon,
        naucelles,
        laroquebrou,
        reilhac,
        sansac,
        saintsimon,
        mauriac,
        saintcernin
    }

    private static string CreateId()
    {
        return ObjectId.GenerateNewId().ToString();
    }

    // Rallying Points
    private static RallyingPoint aurillac = new RallyingPoint(
        CreateId(), "Aurillac",
        new LatLng(44.9285441, 2.4433101), true);

    private static RallyingPoint saintpaul = new RallyingPoint(
        CreateId(), "Saint-Paul-des-Landes",
        new LatLng(44.9439943, 2.3125999), true);

    private static RallyingPoint ytrac = new RallyingPoint(
        CreateId(), "Ytrac",
        new LatLng(44.9111838, 2.3633014), true);

    private static RallyingPoint vic = new RallyingPoint(
        CreateId(), "Vic-sur-Cère",
        new LatLng(44.9802528, 2.6244222), true);

    private static RallyingPoint arpajon = new RallyingPoint(
        CreateId(), "Arpajon-sur-Cère",
        new LatLng(44.9034428, 2.4570176), true);

    private static RallyingPoint naucelles = new RallyingPoint(
        CreateId(), "Naucelles",
        new LatLng(44.9556611, 2.4175947), true);

    private static RallyingPoint laroquebrou = new RallyingPoint(
        CreateId(), "Laroquebrou",
        new LatLng(44.967739, 2.1911658), true);

    private static RallyingPoint reilhac = new RallyingPoint(
        CreateId(), "Reilhac",
        new LatLng(44.9734047, 2.4192191), true);

    private static RallyingPoint sansac = new RallyingPoint(
        CreateId(), "Sansac-de-Marmiesse",
        new LatLng(44.8824607, 2.3485484), true);

    private static RallyingPoint saintsimon = new RallyingPoint(
        CreateId(), "Saint-Simon",
        new LatLng(44.9642272, 2.4898166), true);

    private static RallyingPoint mauriac = new RallyingPoint(
        CreateId(), "Mauriac",
        new LatLng(45.2178285, 2.331882), true);

    private static RallyingPoint saintcernin = new RallyingPoint(
        CreateId(), "Saint-Cernin",
        new LatLng(45.0591427, 2.4213159), true);

    public static Dictionary<CantalPoints, RallyingPoint> GetRallyingPoints()
    {
        return new Dictionary<CantalPoints, RallyingPoint>()
        {
            { CantalPoints.aurillac, aurillac },
            { CantalPoints.saintpaul, saintpaul },
            { CantalPoints.ytrac, ytrac },
            { CantalPoints.vic, vic },
            { CantalPoints.arpajon, arpajon },
            { CantalPoints.naucelles, naucelles },
            { CantalPoints.laroquebrou, laroquebrou },
            { CantalPoints.reilhac, reilhac },
            { CantalPoints.sansac, sansac },
            { CantalPoints.saintsimon, saintsimon },
            { CantalPoints.mauriac, mauriac },
            { CantalPoints.saintcernin, saintcernin },
        };
    }
}