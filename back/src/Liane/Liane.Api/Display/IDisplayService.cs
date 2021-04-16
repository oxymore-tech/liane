using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Display
{
    public interface IDisplayService
    {
        Task<ImmutableList<RallyingPoint>> SnapPosition(LatLng latLng);
        Task<ImmutableList<RallyingPoint>> ListDestinationsFrom(RallyingPoint labeledPosition);

        ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Trip.Trip> trips);

        Task<ImmutableHashSet<Trip.Trip>> SearchTrips(SearchQuery query) => SearchTrips(query.Day, query.Start, query.End, query.From, query.To, query.Mine);
        Task<ImmutableHashSet<Trip.Trip>> SearchTrips(DayOfWeek? day, RallyingPoint? start, RallyingPoint? end, int from = 0, int to = 23, bool mine = false);

        Task<Dictionary<string, RouteStat>> ListRoutesEdgesFrom(ImmutableHashSet<Trip.Trip> trips, DayOfWeek? day, int from = 0, int to = 23);
    }
}