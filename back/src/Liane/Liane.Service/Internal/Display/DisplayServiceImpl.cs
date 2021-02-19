using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using IOsrmService = Liane.Service.Internal.Osrm.IOsrmService ;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;
using System;

namespace Liane.Service.Internal.Display
{
    public sealed class DisplayServiceImpl : IDisplayService
    {
        private readonly ILogger<DisplayServiceImpl> logger;
        private readonly IRedis redis;
        private readonly ITripService tripService;
        private readonly IOsrmService osrmService;

        public DisplayServiceImpl(ILogger<DisplayServiceImpl> logger, IRedis redis, ITripService tripService, IOsrmService osrmService)
        {
            this.logger = logger;
            this.tripService = tripService;
            this.redis = redis;
            this.osrmService = osrmService;
        }

        public Task<ImmutableList<Api.Trip.Trip>> DisplayTrips(DisplayQuery displayQuery)
        {
            return Task.FromResult(ImmutableList<Api.Trip.Trip>.Empty);
        }

        public async Task<ImmutableList<RallyingPoint>> SnapPosition(LatLng position)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("RallyingPoints");
            var results = await database.GeoRadiusAsync(redisKey, position.Lng, position.Lat, 500, options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
            return results.Select(r =>
                {
                    var geoPosition = r.Position!.Value;
                    return new RallyingPoint(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), r.Distance);
                })
                .ToImmutableList();
        }

        public async Task<ImmutableList<RallyingPoint>> ListDestinationsFrom(RallyingPoint start)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("RallyingPoints");
            var results = await database.GeoRadiusAsync(redisKey, start.Id, 500, unit: GeoUnit.Kilometers, order: Order.Ascending,
                options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
            return results
                .Where(r => r.Member != start.Id)
                .Select(r =>
                {
                    var geoPosition = r.Position!.Value;
                    return new RallyingPoint(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), r.Distance);
                })
                .ToImmutableList();
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> ListTripsFrom(RallyingPoint start)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("RallyingPoints");
            var tripsFromStart = new List<Api.Trip.Trip>();
            var routesFromStart = new List<List<LatLng>>();
            foreach (var trip in await tripService.List())
            {
                foreach (var position in trip.Coordinates)
                {
                    var results = await database.GeoRadiusAsync(redisKey, position.Position.Lng, position.Position.Lat, 1000, options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
                    var nearestPoint = results
                    .Where(r => r.Member == start.Id)
                    .Select(r =>
                    {
                        var geoPosition = r.Position!.Value;
                        return new RallyingPoint(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), r.Distance);
                    });
                    if (nearestPoint.LongCount() > 0) {
                        var startPoint = new List<RallyingPoint>();
                        startPoint.Add(start);
                        var coordinatesAfterPosition = trip.Coordinates.GetRange(trip.Coordinates.IndexOf(position) + 1, trip.Coordinates.Count() - trip.Coordinates.IndexOf(position) - 1);
                        var coordinatesFromStart = startPoint.Concat(coordinatesAfterPosition).ToImmutableList();
                        var aTripFromStart = new Api.Trip.Trip(coordinatesFromStart);
                        tripsFromStart.Add(aTripFromStart);
                        break;
                    }
                }
            }
            return tripsFromStart.ToImmutableHashSet();
        }
        
        public async Task<Dictionary<string, ImmutableList<LatLng>>> ListRoutesEdgesFrom(ImmutableHashSet<Api.Trip.Trip> trips) {
            Console.WriteLine("TRIPS : ", trips);
            var routesEdges = new Dictionary<string, ImmutableList<LatLng>>();
            foreach (var trip in trips)
            {
                for (int i = 0; i < trip.Coordinates.LongCount() - 1; i += 2) {
                    var vertex1 = trip.Coordinates[i];
                    var vertex2 = trip.Coordinates[i + 1];
                    var key = vertex1.Id + "_" + vertex2.Id;
                    if (!routesEdges.ContainsKey(key)){
                        var route = await osrmService.Route(ImmutableList.Create(vertex1.Position, vertex2.Position));
                        routesEdges.Add(key, route.Waypoints.Select(waypoint => waypoint.Location).ToImmutableList());
                    }
                }
            }
            return routesEdges;
        }
        private IImmutableSet<RallyingPoint> ListDestinationsFrom(ImmutableList<Api.Trip.Trip> trips) {
            return trips.Select(t => t.Coordinates.Last())
                .ToImmutableHashSet();
        }

        
    }
}