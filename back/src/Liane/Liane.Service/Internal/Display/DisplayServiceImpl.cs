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
using Expo.Server.Client;
using Expo.Server.Models;
using Newtonsoft.Json.Linq;

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
            foreach (var trip in await tripService.List())
            {
                foreach (var position in trip.Coordinates)
                {
                    if (position != trip.Coordinates[trip.Coordinates.Count - 1]) {
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
                    if (position != trip.Coordinates[0]) {
                        steps.Add(position);
                    }
                }
            }
            return steps.ToImmutableHashSet();
        }

        public ImmutableList<RedisKey> EdgeKeys(IServer server) {
            var keys = server.Keys(-1, "*|*|*|*");
            return keys.ToImmutableList();
        }

        public ImmutableList<RedisKey> FilterByDay(ImmutableList<RedisKey> edgeKeys, string day) {
            var keysProperDay = edgeKeys.Where(key => key.ToString().Split("|").Contains(day));
            return keysProperDay.ToImmutableList();
        }

        public ImmutableList<RedisKey> FilterByStartHour(ImmutableList<RedisKey> edgeKeys, int hour = 0) {
            var keysProperDay = edgeKeys.Where(key => { var listPipe = key.ToString().Split("|");
                                                        return Int16.Parse(listPipe[listPipe.Length - 1]) >= hour;});
            return keysProperDay.ToImmutableList();
        }

        public ImmutableList<RedisKey> FilterByEndHour(ImmutableList<RedisKey> edgeKeys, int hour = 24) {
            var keysProperDay = edgeKeys.Where(key => { var listPipe = key.ToString().Split("|");
                                                        return Int16.Parse(listPipe[listPipe.Length - 1]) <= hour;});
            return keysProperDay.ToImmutableList();
        }

        public ImmutableList<RedisKey> FilterByStartPoint(ImmutableList<RedisKey> edgeKeys, string startPoint) {
            var keysProperDay = edgeKeys.Where(key => { var listPipe = key.ToString().Split("|");
                                                        return listPipe[0] == startPoint;});
            return keysProperDay.ToImmutableList();
        }

        public ImmutableList<RedisKey> FilterByEndPoint(ImmutableList<RedisKey> edgeKeys, string endPoint) {
            var keysProperDay = edgeKeys.Where(key => { var listPipe = key.ToString().Split("|");
                                                        return listPipe[1] == endPoint;});
            return keysProperDay.ToImmutableList();
        }
        public async Task<ImmutableList<Api.Trip.Trip>> DecomposeTrip(RallyingPoint start, RallyingPoint end)
        {
            var coordinates = ImmutableList.Create(start.Position, end.Position);
            var routeResponse = await osrmService.Route(coordinates, "true", overview: "full");
            var routes = routeResponse.Routes.Select(r => new Route(r.Geometry.Coordinates, r.Duration, r.Distance))
                .ToImmutableList();
            var trips = new List<Api.Trip.Trip>();
            var database = await redis.Get();
            var redisKey = new RedisKey("RallyingPoints");
            foreach (var route in routes)
            {
                var points = new HashSet<RallyingPoint>();
                for (int i = 0; i < route.Coordinates.Count() - 1; i += 10)
                {
                    var results = await database.GeoRadiusAsync(redisKey, route.Coordinates[i].Lng, route.Coordinates[i].Lat, 1000, options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
                    if(results.Length > 0) {
                        var nearestPoint = results[0];
                        points.Add(new RallyingPoint(nearestPoint.Member, new LatLng(nearestPoint.Position!.Value.Latitude, nearestPoint.Position!.Value.Longitude)));
                    }
                }
                var trip = new Api.Trip.Trip(points.ToImmutableList());
                trips.Add(trip);
            }
            return trips.ToImmutableList();
        }
        public async Task<ImmutableList<Api.Trip.Trip>> SearchTrip(RallyingPoint start, RallyingPoint end, string day, int hour) {
            var segmentsTrip = await DecomposeTrip(start, end);
            var listeTrajets = new List<Api.Trip.Trip>();
            var database = await redis.Get();
            segmentsTrip.ForEach(ListPoints => {
                RedisValue[] listeUtilisateurs = {};
                for(int i = 0; i < ListPoints.Coordinates.Count-1; i++) {
                    var redisKey = new RedisKey(ListPoints.Coordinates[i].Id + "|" + ListPoints.Coordinates[i+1].Id + "|" + day + "|" + hour.ToString());
                    var users = database.HashKeys(redisKey);
                    if (i==0) {
                        listeUtilisateurs = users;
                    } else {
                        listeUtilisateurs = listeUtilisateurs.Where(utilisateur => users.Contains(utilisateur)).ToArray();
                    }
                }
                Array.ForEach(listeUtilisateurs, user => {
                    var trip = new Api.Trip.Trip(ListPoints.Coordinates, user.ToString(), hour);
                    listeTrajets.Add(trip);
                });
            });
            return listeTrajets.ToImmutableList();
        }

        public async Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom(ImmutableHashSet<Api.Trip.Trip> trips, 
                                                                                         string day,
                                                                                         int hour1 = 0, 
                                                                                         int hour2 = 24) {
            var localRedis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = localRedis.GetEndPoints();
            IServer server = localRedis.GetServer(endPoints[0]);
            var database = await redis.Get();
            var edgeKeys = EdgeKeys(server);
            var routesEdges = new Dictionary<string, RouteStat>();
            foreach (var trip in trips)
            {
                for (int i = 0; i < trip.Coordinates.LongCount() - 1; i += 1) {
                    var vertex1 = trip.Coordinates[i];
                    var vertex2 = trip.Coordinates[i + 1];
                    var key = vertex1.Id + "|" + vertex2.Id;
                    if (!routesEdges.ContainsKey(key)){
                        var routeResponse = await osrmService.Route(vertex1.Position, vertex2.Position);
                        var geojson = routeResponse.Routes[0].Geometry;
                        var duration = routeResponse.Routes[0].Duration;
                        var distance = routeResponse.Routes[0].Distance;
                        var edge = key.Split("|");
                        var startKeys = FilterByStartPoint(edgeKeys, edge[0]);
                        var endKeys = FilterByEndPoint(edgeKeys, edge[1]);
                        var routeKeys = startKeys.Concat(endKeys).ToImmutableHashSet().ToImmutableList();
                        var toCount = FilterByEndHour(FilterByStartHour(FilterByDay(routeKeys, day), hour1), hour2);
                        var stat = 0;
                        foreach (var redisKey in toCount)
                        {
                            stat += database.HashKeys(redisKey).Count();
                        }
                        routesEdges.Add(key, new RouteStat(geojson.Coordinates.ToLatLng(), stat));
                    }
                }
            }
            return routesEdges;
        }

        public async Task NotifyDriver(string user, string name, string number) {
            var database = await redis.Get();
            var redisKey = "notification_" + user;
            var token = await database.StringGetAsync(redisKey);
            var expoSDKClient = new PushApiClient();
            var pushTicketReq = new PushTicketRequest() {
                PushTo = new List<string>() { token },
                PushBadgeCount = 1,
                PushBody = name + " veut covoiturez avec vous !",
                PushData = JObject.Parse("{'type': 'covoiturage_notification', 'name':'" + name + "','number': '" + number + "'}")
            };
            var result = expoSDKClient.PushSendAsync(pushTicketReq).GetAwaiter().GetResult();

            if (result?.PushTicketErrors?.Count() > 0) 
            {
                foreach (var error in result.PushTicketErrors) 
                {
                    Console.WriteLine($"Error: {error.ErrorCode} - {error.ErrorMessage}");
                }
            }
        }

        private IImmutableSet<RallyingPoint> ListDestinationsFrom(ImmutableList<Api.Trip.Trip> trips) {
            return trips.Select(t => t.Coordinates.Last())
                .ToImmutableHashSet();
        }

    }
}