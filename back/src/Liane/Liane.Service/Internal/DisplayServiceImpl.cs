using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Display;
using Liane.Api.Routing;
using StackExchange.Redis;

namespace Liane.Service.Internal
{
    public class DisplayServiceImpl : IDisplayService
    {
        public Task<ImmutableList<Trip>> DisplayTrips(DisplayQuery displayQuery)
        {
            return Task.FromResult(ImmutableList<Trip>.Empty);
        }

        public async Task<LabeledPosition> SnapPosition(LatLng position)
        {
            var rallyingPoints = ImmutableList.Create(new LabeledPosition("Blajoux-Parking", new LatLng(44.33719040451529, 3.4833812113191227)));
            var redis = ConnectionMultiplexer.Connect("localhost");
            var database = redis.GetDatabase();
            var redisKey = new RedisKey("rallying points");
            await database.GeoAddAsync(redisKey, 3.4833812113191227, 44.33719040451529, new RedisValue("Blajoux-Parking"));
            var results = await database.GeoRadiusAsync(redisKey, position.Lng, position.Lat, 500);
            return results[0];
        }

    }
}