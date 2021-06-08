using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;
using Route = Liane.Api.Routing.Route;

namespace Liane.Service.Internal.Display
{
    public sealed class DisplayServiceImpl : IDisplayService
    {
        private readonly ILogger<DisplayServiceImpl> logger;
        private readonly IRedis redis;
        private readonly ITripService tripService;
        private readonly IOsrmService osrmService;
        private readonly IRallyingPointService rallyingPointService;


        public DisplayServiceImpl(ILogger<DisplayServiceImpl> logger, IRedis redis, ITripService tripService, IRallyingPointService rallyingPointService, IOsrmService osrmService)
        {
            this.logger = logger;
            this.tripService = tripService;
            this.rallyingPointService = rallyingPointService;
            this.redis = redis;
            this.osrmService = osrmService;
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> ListTripsFrom(RallyingPoint start)
        {
            var tripsFromStart = new List<Api.Trip.Trip>();
            foreach (var trip in await tripService.List())
            {
                foreach (var position in trip.Coordinates)
                {
                    if (position != trip.Coordinates[^1])
                    {
                        var startPoint = new List<RallyingPoint> {start};
                        var coordinatesAfterPosition = trip.Coordinates.GetRange(trip.Coordinates.IndexOf(position) + 1, trip.Coordinates.Count - trip.Coordinates.IndexOf(position) - 1);
                        var coordinatesFromStart = startPoint.Concat(coordinatesAfterPosition).ToImmutableList();
                        var aTripFromStart = new Api.Trip.Trip(coordinatesFromStart);
                        tripsFromStart.Add(aTripFromStart);
                        break;
                    }
                }
            }

            return tripsFromStart.ToImmutableHashSet();
        }

        public ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Api.Trip.Trip> trips)
        {
            var steps = new List<RallyingPoint>();
            foreach (var trip in trips)
            {
                foreach (var position in trip.Coordinates)
                {
                    if (position != trip.Coordinates[0])
                    {
                        steps.Add(position);
                    }
                }
            }

            return steps.ToImmutableHashSet();
        }

        public async Task<ImmutableList<Api.Trip.Trip>> DecomposeTrip(RallyingPoint start, RallyingPoint end)
        {
            var coordinates = ImmutableList.Create(start.Position, end.Position);
            var routeResponse = await osrmService.Route(coordinates, "true", overview: "full");
            var routes = routeResponse.Routes.Select(r => new Route(r.Geometry.Coordinates.ToLatLng(), r.Duration, r.Distance))
                .ToImmutableList();
            var trips = new List<Api.Trip.Trip>();
            var database = await redis.Get();
            foreach (var route in routes)
            {
                var points = new HashSet<RallyingPoint>();
                for (var i = 0; i < route.Coordinates.Count - 1; i += 10)
                {
                    var results = await database.GeoRadiusAsync(RedisKeys.RallyingPoint(), route.Coordinates[i].Lng, route.Coordinates[i].Lat, 1000,
                        options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
                    if (results.Length > 0)
                    {
                        var nearestPoint = await rallyingPointService.TrySnap(route.Coordinates[i]);
                        if (nearestPoint != null)
                        {
                            points.Add(nearestPoint);
                        }
                    }
                }

                var trip = new Api.Trip.Trip(points.ToImmutableList());
                trips.Add(trip);
            }

            return trips.ToImmutableList();
        }

        public async Task<Api.Trip.Trip> FromKeyToTrip(RedisKey key)
        {
            var points = key.ToString().Split("|");
            var from = await rallyingPointService.Get(points[0]);
            var to = await rallyingPointService.Get(points[1]);
            var point = new HashSet<RallyingPoint>();
            var time = int.Parse(key.ToString().Split("|")[3]);
            point.Add(from);
            point.Add(to);
            return new Api.Trip.Trip(point.ToImmutableList(), Time: time);
        }

        public async Task<(ImmutableHashSet<Api.Trip.Trip>, ImmutableList<RedisKey>)> GetTrips(ImmutableList<RedisKey> edgeKeys, string start, int hour, HashSet<string> listStartPoints)
        {
            listStartPoints.Add(start);
            var listTrips = new HashSet<Api.Trip.Trip>();
            var newKeys = edgeKeys;
            foreach (var key in edgeKeys.FilterByStartPoint(start))
            {
                var endPoint = key.ToString().Split("|")[1];
                var newStartHour = int.Parse(key.ToString().Split("|")[3]);
                if (!listStartPoints.Contains(endPoint) && newStartHour >= hour)
                {
                    newKeys = newKeys.Remove(key);
                    var newTrip = await FromKeyToTrip(key);
                    listTrips.Add(newTrip);
                    var otherTrips = await GetTrips(newKeys, endPoint, newStartHour, listStartPoints);
                    newKeys = otherTrips.Item2;
                    listTrips = (listTrips.Concat(otherTrips.Item1)).ToHashSet();
                }
            }

            return (listTrips.ToImmutableHashSet(), newKeys);
        }

        public async Task<(ImmutableHashSet<Api.Trip.Trip>, ImmutableList<RedisKey>)> GetTripsEnd(ImmutableList<RedisKey> edgeKeys, string end, int hour, HashSet<string> listEndPoints)
        {
            listEndPoints.Add(end);
            var endPointKeys = edgeKeys.FilterByEndPoint(end);
            var listTrips = new HashSet<Api.Trip.Trip>();
            var newKeys = edgeKeys;
            foreach (var key in endPointKeys)
            {
                var startPoint = key.ToString().Split("|")[0];
                var newEndHour = int.Parse(key.ToString().Split("|")[3]);
                if (!listEndPoints.Contains(startPoint) && (newEndHour <= hour))
                {
                    newKeys = newKeys.Remove(key);
                    var newTrip = await FromKeyToTrip(key);
                    listTrips.Add(newTrip);
                    logger.LogInformation("Heure du trajet : {Time}", newTrip.Time);
                    var otherTrips = await GetTripsEnd(newKeys, startPoint, newEndHour, listEndPoints);
                    newKeys = otherTrips.Item2;
                    listTrips = (listTrips.Concat(otherTrips.Item1)).ToHashSet();
                }
            }

            return (listTrips.ToImmutableHashSet(), newKeys);
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> DefaultTrips(RallyingPoint? start, RallyingPoint? end, int from, int to)
        {
            var edgeKeys = await redis.ListEdgeKeys();
            if (start != null && end != null)
            {
                var startTrips = (await GetTrips(edgeKeys, start.Id, from, new HashSet<string>())).Item1;
                var endTrips = (await GetTripsEnd(edgeKeys, end.Id, to, new HashSet<string>())).Item1;
                return startTrips.Intersect(endTrips);
            }

            if (start != null)
            {
                return (await GetTrips(edgeKeys, start.Id, from, new HashSet<string>())).Item1;
            }

            if (end != null)
            {
                return (await GetTripsEnd(edgeKeys, end.Id, to, new HashSet<string>())).Item1;
            }

            var trips = ImmutableHashSet.CreateBuilder<Api.Trip.Trip>();
            var currentEdgeKeys = edgeKeys;
            foreach (var key in edgeKeys)
            {
                var tripsAndKeys = await GetTrips(currentEdgeKeys, key.ToString().Split("|")[0], from, new HashSet<string>());
                foreach (var trip in tripsAndKeys.Item1)
                {
                    trips.Add(trip);
                }

                currentEdgeKeys = tripsAndKeys.Item2;
            }

            return trips.ToImmutableHashSet();
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> Search(SearchQuery searchQuery)
        {
            var segmentsTrip = (await DefaultTrips(searchQuery.From, searchQuery.To, searchQuery.StartHour, searchQuery.EndHour)).ToImmutableList();

            var listeTrajets = new HashSet<Api.Trip.Trip>();
            var database = await redis.Get();
            segmentsTrip.ForEach(trip =>
            {
                RedisValue[] listeUtilisateurs = Array.Empty<RedisValue>();
                var (rallyingPoints, _, time) = trip;
                for (var i = 0; i < rallyingPoints.Count - 1; i++)
                {
                    var redisKey = RedisKeys.Trip(rallyingPoints[i].Id, rallyingPoints[i + 1].Id, searchQuery.Day, (int) time!);
                    var users = database.HashKeys(redisKey);
                    listeUtilisateurs = i == 0
                        ? users
                        : listeUtilisateurs.Where(utilisateur => users.Contains(utilisateur)).ToArray();

                    Array.ForEach(listeUtilisateurs, user => { listeTrajets.Add(new Api.Trip.Trip(rallyingPoints, user.ToString(), time)); });
                }
            });
            return listeTrajets.ToImmutableHashSet();
        }

        public async Task<ImmutableDictionary<string, RouteStat>> GetStat(ImmutableHashSet<Api.Trip.Trip> trips, DayOfWeek? day, int? startHour, int? endHour)
        {
            var database = await redis.Get();
            var edgeKeys = await redis.ListEdgeKeys(day);
            var routesEdges = new Dictionary<string, RouteStat>();
            foreach (var (rallyingPoints, _, _) in trips)
            {
                for (var i = 0; i < rallyingPoints.Count - 1; i++)
                {
                    var (segmentStartId, segmentStartPosition, _, _) = rallyingPoints[i];
                    var (segmentEndId, segmentEndPosition, _, _) = rallyingPoints[i + 1];
                    var key = segmentStartId + "|" + segmentEndId;
                    if (!routesEdges.ContainsKey(key))
                    {
                        var routeResponse = await osrmService.Route(segmentStartPosition, segmentEndPosition);
                        var geojson = routeResponse.Routes[0].Geometry;
                        var startKeys = edgeKeys.FilterByStartPoint(segmentStartId);
                        var endKeys = edgeKeys.FilterByEndPoint(segmentEndId);
                        var routeKeys = startKeys.Concat(endKeys).ToImmutableHashSet().ToImmutableList();
                        var toCount = routeKeys
                            .FilterByStartHour(startHour ?? 0)
                            .FilterByEndHour(endHour ?? 23);
                        var stat = 0;
                        foreach (var redisKey in toCount)
                        {
                            stat += database.HashKeys(redisKey).Length;
                        }

                        routesEdges.Add(key, new RouteStat(geojson.Coordinates.ToLatLng(), stat));
                    }
                }
            }

            return routesEdges.ToImmutableDictionary();
        }

        public async Task<ImmutableList<RallyingPoint>> ListUserTrips(string user, string day)
        {
            var database = await redis.Get();
            var results = await database.HashGetAllAsync(RedisKeys.Position(user));
            var userTrips = new List<RallyingPoint>();
            foreach (var element in results)
            {
                var timestamp = element.Name;
                var dtDateTime = DateTimeOffset.FromUnixTimeMilliseconds((long) timestamp).DateTime;
                dtDateTime = dtDateTime.AddSeconds(Convert.ToDouble(timestamp)).ToLocalTime();
                if (day == "-1" || Convert.ToInt32(dtDateTime.DayOfWeek).ToString().Equals(day))
                {
                    var rallyingPoint = await rallyingPointService.Get(element.Value);
                    userTrips.Add(rallyingPoint);
                }
            }

            return userTrips.ToImmutableList();
        }
    }
}