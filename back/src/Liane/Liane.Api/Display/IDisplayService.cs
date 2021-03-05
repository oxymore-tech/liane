using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Display
{
    public interface IDisplayService
    {
        Task<ImmutableList<Trip.Trip>> DisplayTrips(DisplayQuery displayQuery);
        Task<ImmutableList<RallyingPoint>> SnapPosition(LatLng latLng);
        Task<ImmutableList<RallyingPoint>> ListDestinationsFrom(RallyingPoint labeledPosition);
        Task<ImmutableList<RallyingPoint>> ListUserTrips(string user, string day);
        Task<ImmutableHashSet<Trip.Trip>> ListTripsFrom(RallyingPoint labeledPosition);
        Task<ImmutableList<Trip.Trip>> DecomposeTrip(RallyingPoint start, RallyingPoint end);
        ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Trip.Trip> trips);
        Task<ImmutableList<Trip.Trip>> SearchTrip(RallyingPoint start, RallyingPoint end, string day, int hour);

        Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom(ImmutableHashSet<Trip.Trip> trips, string day,
            int hour1 = 0,
            int hour2 = 24);
    }
}