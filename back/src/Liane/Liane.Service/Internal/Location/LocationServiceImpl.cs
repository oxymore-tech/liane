using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Location;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
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
        private readonly IDisplayService displayService;

        public LocationServiceImpl(ILogger<LocationServiceImpl> logger, ICurrentContext currentContext, IRedis redis, IDisplayService displayService)
        {
            this.logger = logger;
            this.currentContext = currentContext;
            this.redis = redis;
            this.displayService = displayService;
        }

        public Task LogLocation(ImmutableList<UserLocation> userLocations)
        {
            logger.LogInformation("Receive logs from user {CurrentUser}:\n{userLocations}", currentContext.CurrentUser(), userLocations);
            return Task.CompletedTask;
        }

        public async Task SaveTrip(ImmutableList<UserLocation> userLocations)
        {
            var timestamp = userLocations[0].Timestamp;
            System.DateTime dtDateTime = new DateTime(1970,1,1,0,0,0,0,System.DateTimeKind.Utc);
            dtDateTime = dtDateTime.AddSeconds( timestamp ).ToLocalTime();
            var nearestPoints = await displayService.SnapPosition(new LatLng(userLocations[0].Coords.Latitude, userLocations[0].Coords.Longitude));
            if (nearestPoints.Count > 0)
            {
                var database = await redis.Get();
                var redisKey = new RedisKey(currentContext.CurrentUser());
                var results = await database.HashGetAllAsync(redisKey);
                if (results.Length >= 2)
                {
                    var t0 = results[results.Length - 2].Value;
                    var t1 = results[results.Length - 1].Value;
                    if (t0.Equals(nearestPoints[0].Id) && !t1.Equals(nearestPoints[0].Id))
                    {
                        await database.HashDeleteAsync(redisKey, t1);
                    }
                    if(!t1.Equals(nearestPoints[0].Id)) {
                        var redisKey2 = new RedisKey(t1 + "|" + nearestPoints[0].Id + "|" + dtDateTime.DayOfWeek + "|" + dtDateTime.Hour);
                        await database.HashIncrementAsync(redisKey2, currentContext.CurrentUser(), 1);
                    }
                }
                HashEntry[] newEntry = { new HashEntry(timestamp, nearestPoints[0].Id) };
                await database.HashSetAsync(redisKey, newEntry);
            }
        }
    }
}