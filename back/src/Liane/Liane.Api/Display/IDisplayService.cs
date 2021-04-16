using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;

namespace Liane.Api.Display
{
    public interface IDisplayService
    {
        Task<ImmutableList<RallyingPoint>> SnapPosition(LatLng position);
        Task<ImmutableList<RallyingPoint>> ListDestinationsFrom(string from);

        ImmutableHashSet<RallyingPoint> ListStepsFrom(ImmutableHashSet<Trip.Trip> trips);

        Task<ImmutableHashSet<Trip.Trip>> Search(SearchQuery query);

        Task<Dictionary<string, RouteStat>> GetRoutes(ImmutableHashSet<Trip.Trip> trips, DayOfWeek? day, int? startHour = null, int? endHour = null);
    }
}