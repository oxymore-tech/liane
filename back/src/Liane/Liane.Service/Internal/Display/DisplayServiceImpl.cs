using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.Display
{
    public class DisplayServiceImpl : IDisplayService
    {
        private readonly ILogger<DisplayServiceImpl> logger;
        private readonly IRedis redis;
        private readonly ITripService tripService;

        public DisplayServiceImpl(ILogger<DisplayServiceImpl> logger, IRedis redis, ITripService tripService)
        {
            this.logger = logger;
            this.tripService = tripService;
            this.redis = redis;
        }

        public Task<ImmutableList<Trip>> DisplayTrips(DisplayQuery displayQuery)
        {
            return Task.FromResult(ImmutableList<Trip>.Empty);
        }

        public async Task<ImmutableList<LabeledPosition>> SnapPosition(LatLng position)
        {
            var database = await redis.Get();
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
            var database = await redis.Get();
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
            var database = await redis.Get();
            var redisKey = new RedisKey("rallying points");
            var tripsFromStart = new List<Trip>();
            foreach (var trip in await tripService.List())
            {
                foreach (var position in trip.Coordinates)
                {
                    var results = await database.GeoRadiusAsync(redisKey, position.Position.Lng, position.Position.Lat, 1000, options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
                    var nearestPoint = results
                    .Where(r => r.Member == start.Label)
                    .Select(r =>
                    {
                        var geoPosition = r.Position!.Value;
                        return new LabeledPosition(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), r.Distance);
                    });
                    if (nearestPoint.LongCount() > 0) {
                        var pointDepart = new List<LabeledPosition>();
                        pointDepart.Add(start);
                        var coordinatesAfterPosition = trip.Coordinates.GetRange(trip.Coordinates.IndexOf(position) + 1, trip.Coordinates.Count() - trip.Coordinates.IndexOf(position) - 1);
                        var coordinatesFromStart = pointDepart.Concat(coordinatesAfterPosition).ToImmutableList();
                        var aTripFromStart = new Trip(coordinatesFromStart);
                        tripsFromStart.Add(aTripFromStart);
                        break;
                    }
                }
            }
            return tripsFromStart.ToImmutableList();
        }

        private IImmutableSet<LabeledPosition> ListDestinationsFrom(ImmutableList<Trip> trips) {
            return trips.Select(t => t.Coordinates.Last())
                .ToImmutableHashSet();
        }
    }
}