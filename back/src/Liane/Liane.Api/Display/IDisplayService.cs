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
        Task<Dictionary<string, ImmutableList<LatLng>>> ListRoutesEdgesFrom(ImmutableHashSet<Trip.Trip> trips);
        Task<ImmutableList<Api.Trip.Trip>> DecomposeTrip(RallyingPoint start, RallyingPoint end);
        ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Trip.Trip> trips);
        ImmutableList<RedisKey> EdgeKeys(IServer server);
        ImmutableList<RedisKey> FilterByDay(ImmutableList<RedisKey> edgeKeys, string jour);
        ImmutableList<RedisKey> FilterByStartHour(ImmutableList<RedisKey> edgeKeys, int hour = 0);
        ImmutableList<RedisKey> FilterByEndHour(ImmutableList<RedisKey> edgeKeys, int hour = 24);
        ImmutableList<RedisKey> FilterByStartPoint(ImmutableList<RedisKey> edgeKeys, string startPoint);
        ImmutableList<RedisKey> FilterByEndPoint(ImmutableList<RedisKey> edgeKeys, string endPoint);
        Task<ImmutableList<Api.Trip.Trip>> SearchTrip(RallyingPoint start, RallyingPoint end, string day, int hour);
        Task<Dictionary<string, int>> CreateStat(ImmutableList<string> routesEdges, 
                                                 string day,
                                                 int hour1 = 0, 
                                                 int hour2 = 24);
    }
}