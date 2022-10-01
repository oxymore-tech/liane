using Liane.Api.RallyingPoints;
using Liane.Api.Routing;

namespace Liane.Test.Internal.Match;

internal static class TripIntentStub
{
    public static class CantalPoints
    {
        public static RallyingPoint Aurillac => new("Aurillac", "Aurillac", new LatLng(44.9285441, 2.4433101), true);

        public static RallyingPoint Saintpaul => new("Saint-Paul-des-Landes", "Saint-Paul-des-Landes", new LatLng(44.9439943, 2.3125999), true);

        public static RallyingPoint Ytrac => new("Ytrac", "Ytrac", new LatLng(44.9111838, 2.3633014), true);

        public static RallyingPoint Vic => new("Vic-sur-Cère", "Vic-sur-Cère", new LatLng(44.9802528, 2.6244222), true);

        public static RallyingPoint Arpajon => new("Arpajon-sur-Cère", "Arpajon-sur-Cère", new LatLng(44.9034428, 2.4570176), true);

        public static RallyingPoint Naucelles => new("Naucelles", "Naucelles", new LatLng(44.9556611, 2.4175947), true);

        public static RallyingPoint Laroquebrou => new("Laroquebrou", "Laroquebrou", new LatLng(44.967739, 2.1911658), true);

        public static RallyingPoint Reilhac => new("Reilhac", "Reilhac", new LatLng(44.9734047, 2.4192191), true);

        public static RallyingPoint Sansac => new("Sansac-de-Marmiesse", "Sansac-de-Marmiesse", new LatLng(44.8824607, 2.3485484), true);

        public static RallyingPoint Saintsimon => new("Saint-Simon", "Saint-Simon", new LatLng(44.9642272, 2.4898166), true);

        public static RallyingPoint Mauriac => new("Mauriac", "Mauriac", new LatLng(45.2178285, 2.331882), true);

        public static RallyingPoint Saintcernin => new("Saint-Cernin", "Saint-Cernin", new LatLng(45.0591427, 2.4213159), true);
    }
}