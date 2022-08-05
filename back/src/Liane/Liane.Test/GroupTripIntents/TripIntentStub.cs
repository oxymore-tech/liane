using System.Collections.Generic;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using MongoDB.Bson;

namespace Liane.Test.GroupTripIntents;

public static class TripIntentStub
{
    public enum CantalPoints
    {
        Aurillac,
        Saintpaul,
        Ytrac,
        Vic,
        Arpajon,
        Naucelles,
        Laroquebrou,
        Reilhac,
        Sansac,
        Saintsimon,
        Mauriac,
        Saintcernin
    }

    private static string CreateId()
    {
        return ObjectId.GenerateNewId().ToString();
    }

    // Rallying Points
    private static RallyingPoint _aurillac = new RallyingPoint(
        CreateId(), "Aurillac",
        new LatLng(44.9285441, 2.4433101), true);

    private static RallyingPoint _saintpaul = new RallyingPoint(
        CreateId(), "Saint-Paul-des-Landes",
        new LatLng(44.9439943, 2.3125999), true);

    private static RallyingPoint _ytrac = new RallyingPoint(
        CreateId(), "Ytrac",
        new LatLng(44.9111838, 2.3633014), true);

    private static RallyingPoint _vic = new RallyingPoint(
        CreateId(), "Vic-sur-Cère",
        new LatLng(44.9802528, 2.6244222), true);

    private static RallyingPoint _arpajon = new RallyingPoint(
        CreateId(), "Arpajon-sur-Cère",
        new LatLng(44.9034428, 2.4570176), true);

    private static RallyingPoint _naucelles = new RallyingPoint(
        CreateId(), "Naucelles",
        new LatLng(44.9556611, 2.4175947), true);

    private static RallyingPoint _laroquebrou = new RallyingPoint(
        CreateId(), "Laroquebrou",
        new LatLng(44.967739, 2.1911658), true);

    private static RallyingPoint _reilhac = new RallyingPoint(
        CreateId(), "Reilhac",
        new LatLng(44.9734047, 2.4192191), true);

    private static RallyingPoint _sansac = new RallyingPoint(
        CreateId(), "Sansac-de-Marmiesse",
        new LatLng(44.8824607, 2.3485484), true);

    private static RallyingPoint _saintsimon = new RallyingPoint(
        CreateId(), "Saint-Simon",
        new LatLng(44.9642272, 2.4898166), true);

    private static RallyingPoint _mauriac = new RallyingPoint(
        CreateId(), "Mauriac",
        new LatLng(45.2178285, 2.331882), true);

    private static RallyingPoint _saintcernin = new RallyingPoint(
        CreateId(), "Saint-Cernin",
        new LatLng(45.0591427, 2.4213159), true);

    public static Dictionary<CantalPoints, RallyingPoint> GetRallyingPoints()
    {
        return new Dictionary<CantalPoints, RallyingPoint>()
        {
            { CantalPoints.Aurillac, _aurillac },
            { CantalPoints.Saintpaul, _saintpaul },
            { CantalPoints.Ytrac, _ytrac },
            { CantalPoints.Vic, _vic },
            { CantalPoints.Arpajon, _arpajon },
            { CantalPoints.Naucelles, _naucelles },
            { CantalPoints.Laroquebrou, _laroquebrou },
            { CantalPoints.Reilhac, _reilhac },
            { CantalPoints.Sansac, _sansac },
            { CantalPoints.Saintsimon, _saintsimon },
            { CantalPoints.Mauriac, _mauriac },
            { CantalPoints.Saintcernin, _saintcernin },
        };
    }
}