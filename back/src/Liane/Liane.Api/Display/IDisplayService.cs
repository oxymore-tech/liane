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
        ImmutableList<RedisKey> FilterByStartHour(ImmutableList<RedisKey> edgeKeys, int hour);
        ImmutableList<RedisKey> FilterByEndHour(ImmutableList<RedisKey> edgeKeys, int hour);
        ImmutableList<RedisKey> FilterByStartPoint(ImmutableList<RedisKey> edgeKeys, RallyingPoint startPoint);
        ImmutableList<RedisKey> FilterByEndPoint(ImmutableList<RedisKey> edgeKeys, RallyingPoint endPoint);
    }
}