using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Location;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.Location
{
    public sealed class LocationServiceImpl : ILocationService
    {
        private readonly ILogger<LocationServiceImpl> logger;
        private readonly ICurrentContext currentContext;
        private readonly IRedis redis;
        private readonly IRallyingPointService rallyingPointService;

        public LocationServiceImpl(ILogger<LocationServiceImpl> logger, ICurrentContext currentContext, IRedis redis, IRallyingPointService rallyingPointService)
        {
            this.logger = logger;
            this.currentContext = currentContext;
            this.redis = redis;
            this.rallyingPointService = rallyingPointService;
        }

        public async Task LogLocation(ImmutableList<UserLocation> userLocations)
        {
            logger.LogInformation("Receive logs from user {CurrentUser}:\n{userLocations}", currentContext.CurrentUser(), userLocations);
            var timestamp = userLocations[0].Timestamp;
            var dtDateTime = new DateTime(timestamp);
            var nearestPoint = await rallyingPointService.Snap(new LatLng(userLocations[0].Latitude, userLocations[0].Longitude));
            var database = await redis.Get();
            var redisKey = RedisKeys.Position(currentContext.CurrentUser());
            var results = await database.HashGetAllAsync(redisKey);
            if (results.Length >= 2)
            {
                var t0 = results[^2].Value;
                var t1 = results[^1].Value;
                if (t0.Equals(nearestPoint.Id) && !t1.Equals(nearestPoint.Id))
                {
                    await database.HashDeleteAsync(redisKey, t1);
                }

                if (!t1.Equals(nearestPoint.Id))
                {
                    var redisKey2 = RedisKeys.Trip(t1, nearestPoint.Id, dtDateTime.DayOfWeek, dtDateTime.Hour);
                    await database.HashIncrementAsync(redisKey2, currentContext.CurrentUser());
                }
            }

            HashEntry[] newEntry = {new(timestamp, nearestPoint.Id)};
            await database.HashSetAsync(redisKey, newEntry);
        }
    }
}