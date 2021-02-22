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
        ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Trip.Trip> trips);
        //Dictionary<string, string> databaseToDictionnary(IDatabase database, RedisKey redisKey);
        Dictionary<string, IDatabase> FilterByDay(Dictionary<string, string> dict, string jour);
    }
}