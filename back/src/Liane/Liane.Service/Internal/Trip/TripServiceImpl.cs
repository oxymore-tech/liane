using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Trip;
using IRedis = Liane.Api.Util.IRedis;
using StackExchange.Redis;
using Liane.Api.Routing;
using System.Collections.Generic;

namespace Liane.Service.Internal.Trip
{
    public sealed class TripServiceImpl : ITripService
    {
        private static readonly ImmutableList<string> Mende_Florac = ImmutableList.Create("Mende", "LesBondons_Parking", "Florac");
        private static readonly ImmutableList<string> Blajoux_Florac = ImmutableList.Create("Blajoux_Parking", "Florac");
        private static readonly ImmutableList<string> Blajoux_Mende = ImmutableList.Create("Blajoux_Parking", "Mende");
        private static readonly ImmutableList<string> Ispagnac_Parking_Balsiege_Parking_Eglise = ImmutableList.Create("Ispagnac_Parking", "Balsiege_Parking_Eglise");
        private static readonly ImmutableList<string> Rodez_Mac_Drive_Florac_Mende = ImmutableList.Create("Rodez_Mac_Drive", "Florac", "Mende");
        private static readonly ImmutableList<string> Villefort_Parking_Gare_Severac_dAveyron_Rond_Point_Rodez_Mac_Drive = ImmutableList.Create("Villefort_Parking_Gare", "Severac_dAveyron_Rond_Point", "Rodez_Mac_Drive");
        private static readonly ImmutableList<string> SaintChelyDuTarn_En_Haut_LesBondons_Parking_Villefort_Parking_Gare = ImmutableList.Create("SaintChelyDuTarn_En_Haut", "LesBondons_Parking", "Villefort_Parking_Gare");

        private static readonly ImmutableList<ImmutableList<string>> AllTrips = ImmutableList.Create(
            Mende_Florac,
            Blajoux_Florac,
            Blajoux_Mende,
            Ispagnac_Parking_Balsiege_Parking_Eglise,
            Rodez_Mac_Drive_Florac_Mende,
            Villefort_Parking_Gare_Severac_dAveyron_Rond_Point_Rodez_Mac_Drive,
            SaintChelyDuTarn_En_Haut_LesBondons_Parking_Villefort_Parking_Gare
        );

        private readonly IRedis redis;

        public TripServiceImpl(IRedis redis)
        {
            this.redis = redis;
        }

        public async Task<RallyingPoint?> GetRallyingPoint(string id)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("RallyingPoints");
            var result = await database.GeoPositionAsync(redisKey, id);
            return new RallyingPoint(id, new LatLng(result.Value.Latitude, result.Value.Longitude));
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> List()
        {
            var trips = new HashSet<Api.Trip.Trip>();
            foreach (var trip in AllTrips)
            {
                var rallyingPoints = new List<RallyingPoint>();
                foreach (var id in trip)
                {
                    var point = await GetRallyingPoint(id);
                    if (point != null) {
                        rallyingPoints.Add(point);
                    }
                }
                trips.Add(new Api.Trip.Trip(rallyingPoints.ToImmutableList()));
            }
            return trips.ToImmutableHashSet();
        }
    }
}