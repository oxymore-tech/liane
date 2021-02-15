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
        private static readonly ImmutableList<ImmutableList<string>> AllTrips = ImmutableList.Create(
            Mende_Florac,
            Blajoux_Florac,
            Blajoux_Mende
        );

        private readonly IRedis redis;

        public TripServiceImpl(IRedis redis)
                {
                    this.redis = redis;
                }

        public async Task<RallyingPoint?> GetRallyingPoint(string id)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("rallying points");
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