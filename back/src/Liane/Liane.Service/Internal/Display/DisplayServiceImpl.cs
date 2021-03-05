using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Osrm;
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
                    if (position != trip.Coordinates[^1])
                    {
                        var results = await database.GeoRadiusAsync(redisKey, position.Position.Lng, position.Position.Lat, 1000,
                            options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
                        var nearestPoint = results
                            .Where(r => r.Member == start.Id)
                            .Select(r =>
                            {
                                var geoPosition = r.Position!.Value;
                                return new RallyingPoint(r.Member, new LatLng(geoPosition.Latitude, geoPosition.Longitude), r.Distance);
                            });
                        if (nearestPoint.LongCount() > 0)
                        {
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
            var routes = routeResponse.Routes.Select(r => new Route(r.Geometry.Coordinates, r.Duration, r.Distance))
                .ToImmutableList();
            var trips = new List<Api.Trip.Trip>();
            var database = await redis.Get();
            var redisKey = new RedisKey("RallyingPoints");
            foreach (var route in routes)
            {
                var points = new HashSet<RallyingPoint>();
                for (var i = 0; i < route.Coordinates.Count - 1; i += 10)
                {
                    var results = await database.GeoRadiusAsync(redisKey, route.Coordinates[i].Lng, route.Coordinates[i].Lat, 1000,
                        options: GeoRadiusOptions.WithDistance | GeoRadiusOptions.WithCoordinates);
                    if (results.Length > 0)
                    {
                        var nearestPoint = results[0];
                        points.Add(new RallyingPoint(nearestPoint.Member, new LatLng(nearestPoint.Position!.Value.Latitude, nearestPoint.Position!.Value.Longitude)));
                    }
                }

                var trip = new Api.Trip.Trip(points.ToImmutableList());
                trips.Add(trip);
            }

            return trips.ToImmutableList();
        }

        public static string ImmutableListToString<T>(ImmutableList<T> list)
        {
            if (list.Count == 0)
            {
                return "[]";
            }
            else
            {
                var listString = "[";
                foreach (var element in list)
                {
                    listString += element!.ToString() + ", ";
                }

                return listString.Remove(listString.Length - 2, 2) + "]\n";
            }
        }

        public async Task<Api.Trip.Trip> FromKeyToTrip(RedisKey key)
        {
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
            var time = Int32.Parse(key.ToString().Split("|")[3]);
            //Console.WriteLine($"time : {time}\n");
            point.Add(startRP);
            point.Add(endRP);
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
                if (!listStartPoints.Contains(endPoint) && (newStartHour >= hour))
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
                Console.WriteLine(key.ToString());
                var startPoint = key.ToString().Split("|")[0];
                var newEndHour = int.Parse(key.ToString().Split("|")[3]);
                if (!listEndPoints.Contains(startPoint) && (newEndHour <= hour))
                {
                    //Console.WriteLine($"ancienne heure : {hour}");
                    //Console.WriteLine($"nouvelle heure : {newEndHour}");
                    newKeys = newKeys.Remove(key);
                    var newTrip = await FromKeyToTrip(key);
                    listTrips.Add(newTrip);
                    Console.WriteLine($"Heure du trajet : {newTrip.Time}");
                    var otherTrips = await GetTripsEnd(newKeys, startPoint, newEndHour, listEndPoints);
                    newKeys = otherTrips.Item2;
                    listTrips = (listTrips.Concat(otherTrips.Item1)).ToHashSet();
                }
            }

            return (listTrips.ToImmutableHashSet(), newKeys);
        }

        public ImmutableHashSet<Api.Trip.Trip> Intersect(HashSet<Api.Trip.Trip> startTrips, HashSet<Api.Trip.Trip> endTrips)
        {
            var trips = startTrips;
            var elementNotFound = true;
            foreach (var startTrip in startTrips)
            {
                foreach (var endTrip in endTrips)
                {
                    if (startTrip == endTrip)
                    {
                        //Console.WriteLine("TEST EGALITE OK.");
                        elementNotFound = false;
                    }
                }

                if (elementNotFound)
                {
                    trips.Remove(startTrip);
                }

                elementNotFound = true;
            }

            return trips.ToImmutableHashSet();
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> DefaultTrips(int startHour, int endHour, RallyingPoint? start = null, RallyingPoint? end = null)
        {
            var edgeKeys = await redis.ListEdgeKeys();
            if (start != null && end != null)
            {
                //(await DecomposeTrip(start, end, startHour)).ToImmutableHashSet();
                var startTrips = (await GetTrips(edgeKeys, start.Id, startHour, new HashSet<string>())).Item1;
                var endTrips = (await GetTripsEnd(edgeKeys, end.Id, endHour, new HashSet<string>())).Item1;
                startTrips = Intersect(startTrips.ToHashSet(), endTrips.ToHashSet());
                foreach (var trip in startTrips)
                {
                    Console.WriteLine($"TRIP : {ImmutableListToString(trip.Coordinates)}, {trip.Time}\n");
                }

                return startTrips.ToImmutableHashSet();
            }
            else
            {
                if (start != null)
                {
                    return (await GetTrips(edgeKeys, start.Id, startHour, new HashSet<string>())).Item1.ToImmutableHashSet();
                }
                else
                {
                    if (end != null)
                    {
                        return (await GetTripsEnd(edgeKeys, end.Id, endHour, new HashSet<string>())).Item1.ToImmutableHashSet();
                    }
                    else
                    {
                        var trips = new HashSet<Api.Trip.Trip>();
                        var currentEdgeKeys = edgeKeys;
                        foreach (var key in edgeKeys)
                        {
                            var tripsAndKeys = await GetTrips(currentEdgeKeys, key.ToString().Split("|")[0], startHour, new HashSet<string>());
                            trips = trips.Concat(tripsAndKeys.Item1).ToHashSet();
                            currentEdgeKeys = tripsAndKeys.Item2;
                        }

                        return trips.ToImmutableHashSet();
                    }
                }
            }
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> DefaultSearchTrip(string day = "day", int startHour = 0, int endHour = 23, RallyingPoint? start = null, RallyingPoint? end = null)
        {
            if (day.Equals("day"))
            {
                string[] days = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
                var listTrips = new HashSet<Api.Trip.Trip>();
                for (int i = 0; i < 7; i++)
                {
                    listTrips = listTrips.Concat(await SearchTrip(days[i], startHour, endHour, start, end)).ToHashSet();
                }

                return listTrips.ToImmutableHashSet();
            }
            else
            {
                return (await SearchTrip(day, startHour, endHour, start, end)).ToImmutableHashSet();
            }
        }

        public async Task<ImmutableHashSet<Api.Trip.Trip>> SearchTrip(string day, int startHour, int endHour, RallyingPoint? start = null, RallyingPoint? end = null)
        {
            var segmentsTrip = (await DefaultTrips(startHour, endHour, start, end)).ToImmutableList();
            foreach (var trip in segmentsTrip)
            {
                //Console.WriteLine($"Ici les segments : {ImmutableListToString(trip.Coordinates)}, {trip.Time}");
            }

            var listeTrajets = new HashSet<Api.Trip.Trip>();
            var database = await redis.Get();
            segmentsTrip.ForEach(ListPoints =>
            {
                RedisValue[] listeUtilisateurs = { };
                for (int i = 0; i < ListPoints.Coordinates.Count - 1; i++)
                {
                    //for(int hour = startHour; hour < endHour; hour++) {
                    //Console.WriteLine($"LISTPOINT.TIME: {ListPoints.Time}");
                    var redisKey = new RedisKey(ListPoints.Coordinates[i].Id + "|" + ListPoints.Coordinates[i + 1].Id + "|" + day + "|" + ListPoints.Time);
                    var users = database.HashKeys(redisKey);
                    if (i == 0)
                    {
                        listeUtilisateurs = users;
                    }
                    else
                    {
                        listeUtilisateurs = listeUtilisateurs.Where(utilisateur => users.Contains(utilisateur)).ToArray();
                    }

                    Array.ForEach(listeUtilisateurs, user =>
                    {
                        var trip = new Api.Trip.Trip(ListPoints.Coordinates, user.ToString(), ListPoints.Time);
                        listeTrajets.Add(trip);
                    });
                    //}
                }
            });
            return listeTrajets.ToImmutableHashSet();
        }

        public async Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom(ImmutableHashSet<Api.Trip.Trip> trips,
            string day = "day",
            int hour1 = 0,
            int hour2 = 23)
        {
            var edgeKeys = await redis.ListEdgeKeys();
            var database = await redis.Get();
            var routesEdges = new Dictionary<string, RouteStat>();
            foreach (var (rallyingPoints, _, _) in trips)
            {
                for (var i = 0; i < rallyingPoints.Count - 1; i++)
                {
                    var (segmentStartId, segmentStartPosition, _) = rallyingPoints[i];
                    var (segmentEndId, segmentEndPosition, _) = rallyingPoints[i + 1];
                    var key = segmentStartId + "|" + segmentEndId;
                    if (!routesEdges.ContainsKey(key))
                    {
                        var routeResponse = await osrmService.Route(segmentStartPosition, segmentEndPosition);
                        var geojson = routeResponse.Routes[0].Geometry;
                        var edge = key.Split("|");
                        var startKeys = edgeKeys.FilterByStartPoint(edge[0]);
                        var endKeys = edgeKeys.FilterByEndPoint(edge[1]);
                        var routeKeys = startKeys.Concat(endKeys).ToImmutableHashSet().ToImmutableList();
                        var toCount = routeKeys.FilterByDay(day)
                            .FilterByStartHour(hour1)
                            .FilterByEndHour(hour2);
                        var stat = 0;
                        foreach (var redisKey in toCount)
                        {
                            stat += database.HashKeys(redisKey).Length;
                        }

                        routesEdges.Add(key, new RouteStat(geojson.Coordinates.ToLatLng(), stat));
                    }
                }
            }

            return routesEdges;
        }

        public async Task<ImmutableList<RallyingPoint>> ListUserTrips(string user, string day)
        {
            var database = await redis.Get();
            var redisKey = new RedisKey("positions|" + user);
            var results = await database.HashGetAllAsync(redisKey);
            var userTrips = new List<RallyingPoint>();
            foreach (var element in results)
            {
                var timestamp = element.Name;
                var dtDateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
                dtDateTime = dtDateTime.AddSeconds(Convert.ToDouble(timestamp)).ToLocalTime();
                if (day == "-1" || Convert.ToInt32(dtDateTime.DayOfWeek).ToString().Equals(day))
                {
                    var result = await database.GeoPositionAsync("RallyingPoints", element.Value);
                    if (result != null)
                    {
                        var rp = new RallyingPoint(element.Value, new LatLng(result.Value.Latitude, result.Value.Longitude));
                        userTrips.Add(rp);
                    }
                }
            }

            return userTrips.ToImmutableList();
        }
    }
}