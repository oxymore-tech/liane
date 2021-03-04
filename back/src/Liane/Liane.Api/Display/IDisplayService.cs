using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using StackExchange.Redis;

namespace Liane.Api.Display
{
    public interface IDisplayService
    {
        Task<ImmutableList<Trip.Trip>> DisplayTrips(DisplayQuery displayQuery);
        Task<ImmutableList<RallyingPoint>> SnapPosition(LatLng latLng);
        Task<ImmutableList<RallyingPoint>> ListDestinationsFrom(RallyingPoint labeledPosition);
        Task<ImmutableHashSet<Api.Trip.Trip>> ListTripsFrom(RallyingPoint labeledPosition);
        Task<ImmutableList<Api.Trip.Trip>> DecomposeTrip(RallyingPoint start, RallyingPoint end, int hour);
        ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Trip.Trip> trips);
        ImmutableList<RedisKey> EdgeKeys(IServer server);
        ImmutableList<RedisKey> FilterByDay(ImmutableList<RedisKey> edgeKeys, string jour = "day");
        ImmutableList<RedisKey> FilterByStartHour(ImmutableList<RedisKey> edgeKeys, int hour = 0);
        ImmutableList<RedisKey> FilterByEndHour(ImmutableList<RedisKey> edgeKeys, int hour = 24);
        ImmutableList<RedisKey> FilterByStartPoint(ImmutableList<RedisKey> edgeKeys, string startPoint);
        ImmutableList<RedisKey> FilterByEndPoint(ImmutableList<RedisKey> edgeKeys, string endPoint);
        Task<ImmutableList<RedisKey>> FilterByUser(ImmutableList<RedisKey> edgeKeys, string user);
        Task<(ImmutableHashSet<Api.Trip.Trip>, ImmutableList<RedisKey>)> GetTrips(ImmutableList<RedisKey> edgeKeys, string start, int hour, HashSet<string> listStartPoints);
        Task<(ImmutableHashSet<Api.Trip.Trip>, ImmutableList<RedisKey>)> GetTripsEnd(ImmutableList<RedisKey> edgeKeys, string end, int hour, HashSet<string> listEndPoints);
        Task<Api.Trip.Trip> FromKeyToTrip(RedisKey key);
        ImmutableHashSet<Api.Trip.Trip> Intersect(HashSet<Api.Trip.Trip> startTrips, HashSet<Api.Trip.Trip> endTrips);
        Task<ImmutableHashSet<Api.Trip.Trip>> DefaultTrips(int startHour, int endHour, RallyingPoint? start = null, RallyingPoint? end = null);
        Task<ImmutableHashSet<Api.Trip.Trip>> DefaultSearchTrip(string day = "day", int startHour = 0, int endHour = 23, RallyingPoint? start = null, RallyingPoint? end = null);
        Task<ImmutableHashSet<Api.Trip.Trip>> SearchTrip(string day, int startHour, int endHour, RallyingPoint? start = null, RallyingPoint? end = null);
        Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom(ImmutableHashSet<Trip.Trip> trips, string day = "day",
                                                                                   int hour1 = 0, 
                                                                                   int hour2 = 23);
    }
}