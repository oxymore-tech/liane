using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Util;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal
{
    public sealed class RallyingPointServiceImpl : IRallyingPointService
    {
        private readonly IRedis redis;

        public RallyingPointServiceImpl(IRedis redis)
        {
            this.redis = redis;
        }

        public async Task<RallyingPoint> Get(string id)
        {
            var database = await redis.Get();
            var result = await database.GeoPositionAsync(RedisKeys.RallyingPoint(), id);
            if (!result.HasValue)
            {
                throw new ResourceNotFoundException($"RallyingPoint '{id}' not found");
            }

            return new RallyingPoint(id, new LatLng(result.Value.Latitude, result.Value.Longitude), id.Replace('_', ' '));
        }

        public async Task<RallyingPoint?> TrySnap(LatLng position)
        {
            return (await ListRallyingPointsInternal(position)).FirstOrDefault();
        }

        public async Task<RallyingPoint> Snap(LatLng position)
        {
            var rallyingPoint = await TrySnap(position);
            if (rallyingPoint == null)
            {
                throw new ResourceNotFoundException($"RallyingPoint not found arround position {position} within a radius of 500 km");
            }

            return rallyingPoint;
        }

        public async Task<ImmutableList<RallyingPoint>> List(LatLng center)
        {
            return (await ListRallyingPointsInternal(center))
                .ToImmutableList();
        }

        public async Task<IEnumerable<RallyingPoint>> ListRallyingPointsInternal(LatLng center)
        {
            var database = await redis.Get();
            var results = await database.GeoRadiusAsync(RedisKeys.RallyingPoint(), center.Lng, center.Lat, 50, GeoUnit.Kilometers, order: Order.Ascending,
                options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
            return results
                .Select(r =>
                {
                    var geoPosition = r.Position!.Value;
                    string id = r.Member;
                    return new RallyingPoint(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), id.Replace('_', ' '), r.Distance);
                })
                .OrderBy(p => p.Distance);
        }
    }
}