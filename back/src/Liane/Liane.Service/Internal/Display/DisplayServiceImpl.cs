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

        public ImmutableList<RedisKey> FilterByDay(ImmutableList<RedisKey> edgeKeys, string day = "day") {
            var keysProperDay = edgeKeys.Where(key => key.ToString().Contains(day));
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

        public ImmutableList<RedisKey> FilterByStartPoint(ImmutableList<RedisKey> edgeKeys, string startPoint = "null") {
            var keysProperDay = edgeKeys.Where(key => { var listPipe = key.ToString().Split("|");
                                                        return listPipe[0] == startPoint;});
            return keysProperDay.ToImmutableList();
        }

        public ImmutableList<RedisKey> FilterByEndPoint(ImmutableList<RedisKey> edgeKeys, string endPoint = "null") {
            var keysProperDay = edgeKeys.Where(key => { var listPipe = key.ToString().Split("|");
                                                        return listPipe[1] == endPoint;});
            return keysProperDay.ToImmutableList();
        }

        public async Task<ImmutableList<RedisKey>> FilterByUser(ImmutableList<RedisKey> edgeKeys, string user) {
            var database = await redis.Get();
            var keysProperUser = edgeKeys.Where(key => database.HashKeys(key).Contains(user));
            return keysProperUser.ToImmutableList();
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
        public static string ImmutableListToString<T>(ImmutableList<T> list){
            if (list.Count == 0) {
                return "[]";
            }
            else {
                var listString = "[";
                foreach(var element in list) {
                    
                    listString += element!.ToString() + ", ";
                }
                return listString.Remove(listString.Length - 2, 2) + "]\n";
            }
        }

        public async Task<Api.Trip.Trip> FromKeyToTrip(RedisKey key) {
            var database = await redis.Get();
            var redisKey = new RedisKey("RallyingPoints");
            var results = await database.GeoRadiusAsync(redisKey, 3.483382165431976, 44.33718916852679, 500, GeoUnit.Kilometers);
            var points = key.ToString().Split("|");
            var start = points[0];
            var end = points[1];
            var rallyingPoints = results.Where(r => r.ToString().Equals(start)).ToList();
            rallyingPoints = rallyingPoints.Concat(results.Where(r => r.ToString().Equals(end)).ToList()).ToList();
            var startRP = new RallyingPoint(rallyingPoints[0].Member, new LatLng(rallyingPoints[0].Position!.Value.Latitude, rallyingPoints[0].Position!.Value.Longitude));
            var endRP = new RallyingPoint(rallyingPoints[1].Member, new LatLng(rallyingPoints[1].Position!.Value.Latitude, rallyingPoints[1].Position!.Value.Longitude));
            var point = new HashSet<RallyingPoint>();
            point.Add(startRP);
            point.Add(endRP);
            return new Api.Trip.Trip(point.ToImmutableList());//ImmutableList.Create(startRP, endRP)
        }

        public async Task<(ImmutableHashSet<Api.Trip.Trip>, ImmutableList<RedisKey>)> GetTrips(ImmutableList<RedisKey> edgeKeys, string start, int hour, HashSet<string> listStartPoints){
            listStartPoints.Add(start);
            var startPointKeys = FilterByStartPoint(edgeKeys, start).ToList();
            var listTrips = new HashSet<Api.Trip.Trip>();
            //Console.WriteLine($"startPointKeys : {ImmutableListToString(startPointKeys.ToImmutableList())}");
            var newKeys = edgeKeys;
            foreach (var key in startPointKeys) {
                //Console.WriteLine($"key : {key}");
                var endPoint = key.ToString().Split("|")[1];
                if (!listStartPoints.Contains(endPoint) && (Int32.Parse(key.ToString().Split("|")[3]) >= hour)){
                    newKeys = newKeys.Remove(key);
                    var newTrip = await FromKeyToTrip(key);
                    var a = Int32.Parse(key.ToString().Split("|")[3]);
                    Console.WriteLine($"Int32... : {a}");
                    Console.WriteLine($"HOUR : {hour}");
                    listTrips.Add(newTrip);
                    var otherTrips = await GetTrips(newKeys, endPoint, hour, listStartPoints);
                    newKeys = otherTrips.Item2;
                    listTrips = (listTrips.Concat(otherTrips.Item1)).ToHashSet();
                    //Console.WriteLine($"listTrips after call recursive fct : {ImmutableListToString(listTrips.ToImmutableList())}");
                }
            }
            //Console.WriteLine($"COUNT COUNT: {listTrips.Count}");
            return (listTrips.ToImmutableHashSet(), newKeys);
        }
        
        public async Task<ImmutableHashSet<Api.Trip.Trip>> DefaultTrips(int hour, RallyingPoint? start = null, RallyingPoint? end = null) {
            var localRedis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = localRedis.GetEndPoints();
            IServer server = localRedis.GetServer(endPoints[0]);
            var database = await redis.Get();
            var edgeKeys = EdgeKeys(server);
            if (start != null && end != null) {
                return (await DecomposeTrip(start, end)).ToImmutableHashSet();
            }
            else {
                if (start != null) {
                    return (await GetTrips(edgeKeys, start.Id, hour, new HashSet<string>())).Item1.ToImmutableHashSet();
                }
                else {
                    if (end != null) {
                        var inverseTrips = (await GetTrips(edgeKeys, end!.Id, hour, new HashSet<string>())).Item1;
                        var correctTrips = new HashSet<Api.Trip.Trip>();
                        foreach(var inverseTrip in inverseTrips) {
                            correctTrips.Add(new Api.Trip.Trip(ImmutableList.Create(inverseTrip.Coordinates[1], inverseTrip.Coordinates[0])));
                        }
                        return correctTrips.ToImmutableHashSet();
                    }
                    else {
                        var trips = new HashSet<Api.Trip.Trip>();
                        //Console.WriteLine($"lNB KEYS: {edgeKeys.Count}");
                        var currentEdgeKeys = edgeKeys;
                        foreach (var key in edgeKeys){
                            //Console.WriteLine($"FRANCOIS FRANCOIS: {key}");
                            var tripsAndKeys = await GetTrips(currentEdgeKeys, key.ToString().Split("|")[0], hour, new HashSet<string>());
                            trips = trips.Concat(tripsAndKeys.Item1).ToHashSet();
                            currentEdgeKeys = tripsAndKeys.Item2;
                            //Console.WriteLine($"count currentEdgeKeys : {currentEdgeKeys.Count}");
                            //Console.WriteLine($"count trips : {trips.Count}");
                        }
                        return trips.ToImmutableHashSet();
                    }
                }
                    
            }
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> DefaultSearchTrip(string day, int startHour, int endHour, RallyingPoint? start = null, RallyingPoint? end = null) {
            if (day.Equals("day")){
                string[] days = {"Sunday","Monday", "Tuesday", "Wednesday","Thursday","Friday","Saturday"};
                var listTrips =  new HashSet<Api.Trip.Trip>();
                for(int i = 0; i < 7; i++) {
                    listTrips = listTrips.Concat(await SearchTrip(days[i], startHour, endHour, start, end)).ToHashSet();
                }
                return listTrips.ToImmutableHashSet();
            }
            else {
                return (await SearchTrip(day, startHour, endHour, start, end)).ToImmutableHashSet();
            }
        }
        public async Task<ImmutableHashSet<Api.Trip.Trip>> SearchTrip(string day, int startHour, int endHour, RallyingPoint? start = null, RallyingPoint? end = null) {
            var segmentsTrip = (await DefaultTrips(startHour, start, end)).ToImmutableList();
            Console.WriteLine($"segmentsTrips.Count : {segmentsTrip.Count}");
            foreach(var trip in segmentsTrip){
                Console.WriteLine($"TRIP : {ImmutableListToString(trip.Coordinates)}, user : {trip.User}, time : {trip.Time}");
            }
            var listeTrajets = new HashSet<Api.Trip.Trip>();
            var database = await redis.Get();
            segmentsTrip.ForEach(ListPoints => {
                RedisValue[] listeUtilisateurs = {};
                Console.WriteLine($"nb RP : {ListPoints.Coordinates.Count}");
                for(int i = 0; i < ListPoints.Coordinates.Count-1; i++) {
                    for(int hour = startHour; hour < endHour; hour++) {
                        var redisKey = new RedisKey(ListPoints.Coordinates[i].Id + "|" + ListPoints.Coordinates[i+1].Id + "|" + day + "|" + hour.ToString());
                        var users = database.HashKeys(redisKey);
                        if (i == 0) {
                            listeUtilisateurs = users;
                        } else {
                            listeUtilisateurs = listeUtilisateurs.Where(utilisateur => users.Contains(utilisateur)).ToArray();
                        }
                        Array.ForEach(listeUtilisateurs, user => {
                            var trip = new Api.Trip.Trip(ListPoints.Coordinates, user.ToString(), hour);
                            listeTrajets.Add(trip);
                        });
                    }
                }
                
            });
            /**
            Console.WriteLine(listeTrajets[0].Equals(listeTrajets[1]));
            Console.WriteLine(listeTrajets[0].User == listeTrajets[1].User);
            Console.WriteLine(listeTrajets[0].Time == listeTrajets[1].Time);**/
            Console.WriteLine($"NB ELEMENTS listetrajets : {listeTrajets.ToHashSet().ToImmutableHashSet().Count}");
            return listeTrajets.ToImmutableHashSet();
        }

        public async Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom(ImmutableHashSet<Api.Trip.Trip> trips, 
                                                                                         string day = "day",
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
                PushData = JObject.Parse("{\n" + "name: " + name + ",\n" + "number: " + number + "\n}")
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

        /**
        public async Task<ImmutableHashSet<Api.Trip.Trip>> DefaultTrips(RallyingPoint? start = null, RallyingPoint? end = null) {
            if (start != null && end != null) {
                var result = await DecomposeTrip(start, end);
                return result.ToImmutableHashSet();
            }
            else {
                var database = await redis.Get();
                var redisKey = new RedisKey("RallyingPoints");
                var results = database.GeoRadius(redisKey, 3.483382165431976, 44.33718916852679, 500, GeoUnit.Kilometers);
                var rallyingPoints = results.Select(r => r).ToList();
                var defaultTrips = new List<Api.Trip.Trip>();
                if (start != null) {
                    //Console.WriteLine("Start non null");
                    foreach (var data in rallyingPoints) {
                        var rallyingPoint = new RallyingPoint(data.Member, new LatLng(data.Position!.Value.Latitude, data.Position!.Value.Longitude));
                        //Console.WriteLine(rallyingPoint.Id);
                        //Console.WriteLine(start.Id);
                        if (!rallyingPoint.Id.Equals(start.Id)) {
                            var trip = await DecomposeTrip(start, rallyingPoint);
                            defaultTrips = defaultTrips.Concat(trip).ToList();
                            Console.WriteLine($"Trajet :{ImmutableListToString(trip.ToImmutableList())}");
                        }
                    }
                }
                if (end != null) {
                    foreach (var data in rallyingPoints) {
                        var rallyingPoint = new RallyingPoint(data.Member, new LatLng(data.Position!.Value.Latitude, data.Position!.Value.Longitude));
                        if (!rallyingPoint.Id.Equals(end.Id)) {
                            defaultTrips = defaultTrips.Concat(await DecomposeTrip(rallyingPoint, end)).ToList();
                        }
                    }
                }
                else {
                    foreach (var dataStart in rallyingPoints) {
                        var rallyingPointStart = new RallyingPoint(dataStart.Member, new LatLng(dataStart.Position!.Value.Latitude, dataStart.Position!.Value.Longitude));
                        foreach (var dataEnd in rallyingPoints)
                        {
                            var rallyingPointEnd = new RallyingPoint(dataEnd.Member, new LatLng(dataEnd.Position!.Value.Latitude, dataEnd.Position!.Value.Longitude));
                            defaultTrips = defaultTrips.Concat(await DecomposeTrip(rallyingPointStart, rallyingPointEnd)).ToList();
                        }
                    }
                }
            return defaultTrips.ToImmutableHashSet();
            }
        }**/


    }
}