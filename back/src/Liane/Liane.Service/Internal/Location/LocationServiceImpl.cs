using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Address;
using Liane.Api.Location;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Location
{
    public sealed class LocationServiceImpl : ILocationService
    {
        private readonly ILogger<LocationServiceImpl> logger;
        private readonly ICurrentContext currentContext;
        private readonly IAddressService addressService;
        private readonly IRedis redis;
        private readonly IRallyingPointService rallyingPointService;
        private readonly IRealTripService realTripService;

        public LocationServiceImpl(ILogger<LocationServiceImpl> logger, ICurrentContext currentContext, IRedis redis, IRallyingPointService rallyingPointService, IRealTripService realTripService,
            IAddressService addressService)
        {
            this.logger = logger;
            this.currentContext = currentContext;
            this.redis = redis;
            this.rallyingPointService = rallyingPointService;
            this.realTripService = realTripService;
            this.addressService = addressService;
        }

        public async Task LogLocation(ImmutableList<UserLocation> userLocations)
        {
            var trips = ImmutableHashSet.CreateBuilder<RealTrip>();

            foreach (var trip in SplitTrips(userLocations)
                .Where(l => l.Count >= 2))
            {
                var from = trip[0];
                var to = trip[^1];
                var fromCoordinate = from.ToLatLng();
                var toCoordinate = to.ToLatLng();
                var distance = fromCoordinate.CalculateDistance(toCoordinate);
                if (distance >= 5_000)
                {
                    var fromAddress = await addressService.GetDisplayName(fromCoordinate);
                    var toAddress = await addressService.GetDisplayName(toCoordinate);

                    trips.Add(new RealTrip(
                        new Api.Trip.Location(fromCoordinate, fromAddress.Address),
                        new Api.Trip.Location(toCoordinate, toAddress.Address),
                        DateTimeOffset.FromUnixTimeMilliseconds(from.Timestamp).DateTime,
                        DateTimeOffset.FromUnixTimeMilliseconds(to.Timestamp).DateTime
                    ));
                }
            }

            await realTripService.Save(trips.ToImmutable());
        }

        private static IEnumerable<ImmutableList<UserLocation>> SplitTrips(ImmutableList<UserLocation> userLocations)
        {
            List<UserLocation> currentTrip = new();

            foreach (var userLocation in userLocations.OrderBy(u => u.Timestamp))
            {
                if (currentTrip.Count == 0)
                {
                    currentTrip.Add(userLocation);
                }
                else
                {
                    var previous = currentTrip[^1];
                    if (IsPartOfSameTrip(previous, userLocation))
                    {
                        currentTrip.Add(userLocation);
                    }
                    else
                    {
                        yield return currentTrip.ToImmutableList();
                        currentTrip = new List<UserLocation> {userLocation};
                    }
                }
            }
        }

        private static bool IsPartOfSameTrip(UserLocation previous, UserLocation current)
        {
            var deltaTime = current.Timestamp - previous.Timestamp;
            var distance = previous.ToLatLng().CalculateDistance(current.ToLatLng());
            return deltaTime < TimeSpan.FromMinutes(5).Ticks
                   && distance < 5_000;
        }

        // public async Task LogLocation(ImmutableList<UserLocation> userLocations)
        // {
        //     logger.LogInformation("Receive logs from user {CurrentUser}:\n{userLocations}", currentContext.CurrentUser(), userLocations);
        //     var timestamp = userLocations[0].Timestamp;
        //     var dtDateTime = new DateTime(timestamp);
        //     var nearestPoint = await rallyingPointService.Snap(new LatLng(userLocations[0].Latitude, userLocations[0].Longitude));
        //     var database = await redis.Get();
        //     var redisKey = RedisKeys.Position(currentContext.CurrentUser());
        //     var results = await database.HashGetAllAsync(redisKey);
        //     if (results.Length >= 2)
        //     {
        //         var t0 = results[^2].Value;
        //         var t1 = results[^1].Value;
        //         if (t0.Equals(nearestPoint.Id) && !t1.Equals(nearestPoint.Id))
        //         {
        //             await database.HashDeleteAsync(redisKey, t1);
        //         }
        //
        //         if (!t1.Equals(nearestPoint.Id))
        //         {
        //             var redisKey2 = RedisKeys.Trip(t1, nearestPoint.Id, dtDateTime.DayOfWeek, dtDateTime.Hour);
        //             await database.HashIncrementAsync(redisKey2, currentContext.CurrentUser());
        //         }
        //     }
        //
        //     HashEntry[] newEntry = {new(timestamp, nearestPoint.Id)};
        //     await database.HashSetAsync(redisKey, newEntry);
        // }
    }
}