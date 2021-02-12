using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Liane.Service.Internal.Display
{
    public class DisplayServiceImpl : IDisplayService
    {
        private readonly ILogger<DisplayServiceImpl> logger;
        private readonly RedisSettings redisSettings;
        private ConnectionMultiplexer? redis;
        private readonly ITripService tripService;

        public DisplayServiceImpl(ILogger<DisplayServiceImpl> logger, RedisSettings redisSettings, ITripService tripService)
        {
            this.logger = logger;
            this.redisSettings = redisSettings;
            this.tripService = tripService;
        }

        public Task<ImmutableList<Trip>> DisplayTrips(DisplayQuery displayQuery)
        {
            return Task.FromResult(ImmutableList<Trip>.Empty);
        }

        public async Task<ImmutableList<LabeledPosition>> SnapPosition(LatLng position)
        {
            var database = await GetRedis();
            var redisKey = new RedisKey("rallying points");
            var results = await database.GeoRadiusAsync(redisKey, position.Lng, position.Lat, 500, options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
            return results.Select(r =>
                {
                    var geoPosition = r.Position!.Value;
                    return new LabeledPosition(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), r.Distance);
                })
                .ToImmutableList();
        }

        public async Task<ImmutableList<LabeledPosition>> ListDestinationsFrom(LabeledPosition start)
        {
            var database = await GetRedis();
            var redisKey = new RedisKey("rallying points");
            var results = await database.GeoRadiusAsync(redisKey, start.Label, 500, unit: GeoUnit.Kilometers, order: Order.Ascending,
                options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
            return results
                .Where(r => r.Member != start.Label)
                .Select(r =>
                {
                    var geoPosition = r.Position!.Value;
                    return new LabeledPosition(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), r.Distance);
                })
                .ToImmutableList();
        }

        public async Task<ImmutableList<Trip>> ListTripsFrom(LabeledPosition start)
        {
            var database = await GetRedis();
            var redisKey = new RedisKey("rallying points");
            var closestTrips = new List<Trip>();
            foreach (var trip in await tripService.List())
            {
                foreach (var position in trip.Coordinates)
                {
                    var results = await database.GeoRadiusAsync(redisKey, position.Lng, position.Lat, 1000, options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
                    var nearestPoint = results
                    .Where(r => r.Member == start.Label)
                    .Select(r =>
                    {
                        var geoPosition = r.Position!.Value;
                        return new LabeledPosition(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), r.Distance);
                    });
                    if (nearestPoint.LongCount() > 0) {
                        closestTrips.Add(trip);
                        break;
                    }
                }
            }
            return closestTrips.ToImmutableList();
        }

        private async Task<IDatabase> GetRedis()
        {
            if (redis == null)
            {
                redis = await ConnectionMultiplexer.ConnectAsync(new ConfigurationOptions {EndPoints = {{redisSettings.Host, 6379}}, Password = redisSettings.Password});
                logger.LogInformation("Successfully connected to redis");
                return redis.GetDatabase();
            }

            return redis.GetDatabase();
        }
    }
}