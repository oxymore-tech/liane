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

        ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Trip.Trip> trips);

        Task<ImmutableHashSet<Trip.Trip>> DefaultSearchTrip(string day = "day", int startHour = 0, int endHour = 23, RallyingPoint? start = null, RallyingPoint? end = null);

        Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom(ImmutableHashSet<Trip.Trip> trips, string day = "day",
            int hour1 = 0,
            int hour2 = 23);
    }
}