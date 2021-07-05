using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Address;
using Liane.Api.Location;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.Location
{
    public sealed class LocationServiceImpl : ILocationService
    {
        private const int DeltaTimeTrip = 1000 * 60 * 30; // 30 minutes gap = two different trips
        private const int DeltaMTrip = 1000 * 5; // 5 000 m gap = two different trips
        private const int MinLocTrip = 2; // Less than 2 loc isn't a trip
        private const int MinDistTrip = 1000; // Less than 1 000 m isn't a trip

        private const int MinDistRallyingPoint = 500; // 500 m

        private readonly ILogger<LocationServiceImpl> logger;
        private readonly ICurrentContext currentContext;
        private readonly IAddressService addressService;
        private readonly IRedis redis;
        private readonly IRallyingPointService rallyingPointService;
        private readonly IRealTripService realTripService;
        private readonly IRawTripService rawTripService;
        private readonly ILianeTripService lianeTripService;

        public LocationServiceImpl(
            ILogger<LocationServiceImpl> logger, ICurrentContext currentContext, IRedis redis, IRallyingPointService rallyingPointService, IRealTripService realTripService,
            IAddressService addressService, IRawTripService rawTripService, ILianeTripService lianeTripService
            )
        {
            this.logger = logger;
            this.currentContext = currentContext;
            this.redis = redis;
            this.rallyingPointService = rallyingPointService;
            this.realTripService = realTripService;
            this.addressService = addressService;
            this.rawTripService = rawTripService;
            this.lianeTripService = lianeTripService;
        }

        public async Task LogLocation(ImmutableList<UserLocation> userLocations)
        {
            if (userLocations.Count >= MinLocTrip)
            {
                logger.LogInformation("Log locations (creating raw and real trip) : {userLocations}", JsonSerializer.Serialize(userLocations));

                // Save the raw data as a trip
                await rawTripService.Save(ImmutableList.Create(new RawTrip(userLocations, null)));

                // Try to create one or more trip from the raw data
                var trips = ImmutableHashSet.CreateBuilder<RealTrip>();
                var rallyingPoints = ImmutableHashSet.CreateBuilder<ImmutableHashSet<RallyingPoint>>();

                foreach (var trip in SplitTrips(userLocations)
                    .Where(l => l.Count >= MinLocTrip))
                {
                    var distance = trip[0].ToLatLng().CalculateDistance(trip[^1].ToLatLng());

                    if (!(distance >= MinDistTrip)) continue;
                    
                    trips.Add(await CreateRealTrip(trip));
                    rallyingPoints.Add(await CreateRallyingPoints(trip));
                }

                await realTripService.Save(trips.ToImmutable());
                await lianeTripService.Create(rallyingPoints.ToImmutable(), userLocations.First().Timestamp);

                logger.LogInformation("Created {count} trips, expected 1", trips.Count);
                logger.LogInformation("Created {count} lianes, expected 1", rallyingPoints.Count);
            }
        }

        private async Task<RealTrip> CreateRealTrip(ImmutableList<UserLocation> trip)
        {
            var from = trip[0];
            var to = trip[^1];
            var fromCoordinate = from.ToLatLng();
            var toCoordinate = to.ToLatLng();
            var fromAddress = await addressService.GetDisplayName(fromCoordinate);
            var toAddress = await addressService.GetDisplayName(toCoordinate);
                    
            var realTrip = new RealTrip(
                new Api.Trip.Location(fromCoordinate, fromAddress.Address),
                new Api.Trip.Location(toCoordinate, toAddress.Address),
                DateTimeOffset.FromUnixTimeMilliseconds(from.Timestamp).DateTime,
                DateTimeOffset.FromUnixTimeMilliseconds(to.Timestamp).DateTime
            );

            return realTrip;
        }
        
        private async Task<ImmutableHashSet<RallyingPoint>> CreateRallyingPoints(ImmutableList<UserLocation> trip)
        {
            var rallyingPoints = ImmutableHashSet.CreateBuilder<RallyingPoint>();
            var database = await redis.Get();

            foreach (var l in trip)
            {
                var results = await database.GeoRadiusAsync(RedisKeys.RallyingPoint(), l.Longitude, l.Latitude, MinDistRallyingPoint, GeoUnit.Meters, order: Order.Ascending,
                    options: GeoRadiusOptions.WithCoordinates);

                if (results.Length > 0)
                {
                    var r = results.First();
                    var p = r.Position!.Value;
                    rallyingPoints.Add(new RallyingPoint(r.Member, new LatLng(p.Latitude, p.Longitude), r.Member));
                }
            }

            return rallyingPoints.ToImmutable();
        }

        private static IEnumerable<ImmutableList<UserLocation>> SplitTrips(ImmutableList<UserLocation> userLocations)
        {
            List<UserLocation> currentTrip = new();
            var previousIndex = -1;

            foreach (var current in userLocations.OrderBy(u => u.Timestamp))
            {
                if (previousIndex < 0)
                {
                    currentTrip.Add(current);
                    previousIndex++;
                }
                else
                {
                    var previous = currentTrip[previousIndex];

                    if (IsPartOfSameTrip(previous, current))
                    {
                        currentTrip.Add(current);
                        previousIndex++;
                    }
                    else
                    {
                        yield return currentTrip.ToImmutableList();
                        currentTrip = new List<UserLocation> {current};
                        previousIndex = -1;
                    }
                }
            }
        }

        private static bool IsPartOfSameTrip(UserLocation previous, UserLocation current)
        {
            var time = current.Timestamp - previous.Timestamp <= DeltaTimeTrip;
            var distance = previous.ToLatLng().CalculateDistance(current.ToLatLng()) <= DeltaMTrip;
            return time && distance;
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